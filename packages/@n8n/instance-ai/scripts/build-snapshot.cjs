#!/usr/bin/env node
/**
 * Build a versioned Daytona snapshot for the running n8n version.
 *
 * Run from the n8n release pipeline (see
 * `.github/workflows/release-build-daytona-snapshot.yml`). Authenticates
 * with a static Daytona admin API key supplied via env vars and creates
 * the snapshot named `n8n/instance-ai:<version>` from the same image
 * descriptor with the workflow SDK and its runtime workspace dependencies
 * packed from the release checkout. Re-runs against the same version are
 * idempotent — "already exists" is treated as success.
 *
 * The runtime never calls `snapshot.create`; CI is the only producer of
 * versioned snapshots.
 *
 * The actual create-with-already-exists logic lives in
 * `SnapshotManager.createSnapshot`.
 *
 * CommonJS so Node resolves the package via `main: dist/index.js` instead
 * of the bundler-only `module: src/index.ts` entry.
 *
 * Required env vars:
 *   DAYTONA_API_KEY   admin key with snapshot create/delete permissions
 *   DAYTONA_API_URL   Daytona API base URL (optional — SDK default used if absent)
 *   DAYTONA_SNAPSHOT_MAX_AGE_DAYS
 *                     prune versioned snapshots not used within this many days
 *                     (lastUsedAt, falling back to createdAt). Runs after a
 *                     successful publish and on quota-exceeded errors.
 *                     0 disables age pruning. Default: 20.
 *   DAYTONA_SNAPSHOT_RETENTION
 *                     hard cap on versioned snapshots per org (quota backstop);
 *                     least-recently-used ones are evicted beyond this count.
 *                     0 disables the cap. Default: 10.
 *
 * Usage:
 *   node packages/@n8n/instance-ai/scripts/build-snapshot.cjs --version 1.123.0
 *   node packages/@n8n/instance-ai/scripts/build-snapshot.cjs --version 1.123.0 --verify-image
 */

const { Daytona } = require('@daytona/sdk');
const {
	BuilderTemplatesService,
	SnapshotManager,
	builderTemplatesOptionsFromEnv,
} = require('@n8n/instance-ai');

function parseVersion(argv) {
	const flagIdx = argv.indexOf('--version');
	if (flagIdx !== -1 && argv[flagIdx + 1]) return argv[flagIdx + 1];
	for (const arg of argv) {
		if (arg.startsWith('--version=')) return arg.slice('--version='.length);
	}
	return process.env.N8N_VERSION;
}

function isImageVerification(argv) {
	return argv.includes('--verify-image');
}

const DEFAULT_SNAPSHOT_RETENTION = 10;
const DEFAULT_SNAPSHOT_MAX_AGE_DAYS = 20;

/**
 * Read a non-negative integer env var. These are tuning knobs — a malformed
 * value warns and falls back to the default instead of failing the release.
 */
function readNonNegativeIntEnv(name, defaultValue) {
	const rawValue = process.env[name];
	if (rawValue === undefined || rawValue === '') return defaultValue;
	const parsed = Number.parseInt(rawValue, 10);
	if (!Number.isInteger(parsed) || parsed < 0 || String(parsed) !== rawValue.trim()) {
		console.warn(`Invalid ${name} "${rawValue}" — using default ${defaultValue}`);
		return defaultValue;
	}
	return parsed;
}

const consoleLogger = {
	info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
	warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta })),
	error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
	debug: () => {},
};

async function getSnapshotIfExists(daytona, name) {
	try {
		return await daytona.snapshot.get(name);
	} catch (error) {
		if (error && typeof error === 'object' && error.statusCode === 404) return null;
		throw error;
	}
}

async function deleteVerificationSnapshot(daytona, name) {
	const snapshot = await getSnapshotIfExists(daytona, name);
	if (!snapshot) return;

	await daytona.snapshot.delete(snapshot);
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		if (!(await getSnapshotIfExists(daytona, name))) return;
		await new Promise((resolve) => setTimeout(resolve, 2_000));
	}
	throw new Error(`Timed out while deleting Daytona verification snapshot "${name}"`);
}

async function verifyImage(daytona, image) {
	const runId = process.env.GITHUB_RUN_ID ?? `${process.pid}-${Date.now()}`;
	const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? 'local';
	const name = `n8n/instance-ai-verify:${runId}-${runAttempt}`;
	let verificationError;

	try {
		await daytona.snapshot.create(
			{ name, image },
			{ timeout: 1_800, onLogs: (chunk) => process.stdout.write(`${chunk}\n`) },
		);
		const snapshot = await daytona.snapshot.get(name);
		if (snapshot.state !== 'active') {
			throw new Error(`Daytona verification snapshot is ${snapshot.state}, not active`);
		}
		consoleLogger.info('Daytona image verified', { name });
	} catch (error) {
		verificationError = error;
	}

	try {
		await deleteVerificationSnapshot(daytona, name);
		consoleLogger.info('Daytona verification snapshot deleted', { name });
	} catch (cleanupError) {
		if (verificationError) {
			consoleLogger.warn('Failed to delete Daytona verification snapshot', {
				name,
				error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
			});
		} else {
			throw cleanupError;
		}
	}

	if (verificationError) throw verificationError;
}

async function main() {
	const argv = process.argv.slice(2);
	const version = parseVersion(argv);
	if (!version) {
		console.error('Missing --version (or N8N_VERSION env)');
		process.exit(1);
	}

	const apiKey = process.env.DAYTONA_API_KEY;
	if (!apiKey) {
		console.error('Missing DAYTONA_API_KEY');
		process.exit(1);
	}
	const apiUrl = process.env.DAYTONA_API_URL || undefined;

	const retention = readNonNegativeIntEnv('DAYTONA_SNAPSHOT_RETENTION', DEFAULT_SNAPSHOT_RETENTION);
	const maxAgeDays = readNonNegativeIntEnv(
		'DAYTONA_SNAPSHOT_MAX_AGE_DAYS',
		DEFAULT_SNAPSHOT_MAX_AGE_DAYS,
	);

	const daytona = new Daytona({ apiKey, apiUrl });
	const baseImage = process.env.SANDBOX_IMAGE || undefined;
	const templatesService = new BuilderTemplatesService({
		...builderTemplatesOptionsFromEnv({ logger: consoleLogger }),
		fetch,
	});
	const manager = new SnapshotManager(baseImage, consoleLogger, version, templatesService, {
		packWorkspacePackages: true,
	});
	if (isImageVerification(argv)) {
		await verifyImage(daytona, await manager.ensureImage());
		return;
	}

	const name = await manager.createSnapshot(daytona, {
		timeout: 1800,
		onLogs: (chunk) => process.stdout.write(`${chunk}\n`),
		retention: retention > 0 ? retention : undefined,
		maxAgeDays: maxAgeDays > 0 ? maxAgeDays : undefined,
	});

	consoleLogger.info('Snapshot ready', { name });
}

main().then(
	// Exit explicitly: a Daytona request abandoned by its deadline (e.g. a hung
	// prune call) would otherwise keep the event loop alive until the CI runner
	// kills the job despite a successful publish. The empty write drains any
	// buffered stdout (e.g. streamed build logs) before the forced exit.
	() => process.stdout.write('', () => process.exit(0)),
	(error) => {
		consoleLogger.error('Snapshot creation failed', {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	},
);
