#!/usr/bin/env node
/**
 * Build a versioned Daytona snapshot for the running n8n version.
 *
 * Run from the n8n release pipeline (see
 * `.github/workflows/release-build-daytona-snapshot.yml`). Authenticates
 * with a static Daytona admin API key supplied via env vars and creates
 * the snapshot named `n8n-instance-ai-<version>` from the same image
 * descriptor used by the runtime fallback path. Re-runs against the same
 * version are idempotent — "already exists" is treated as success.
 *
 * The runtime never calls `snapshot.create` through the sandbox proxy in
 * cloud mode; CI is the only producer of cloud snapshots.
 *
 * Required env vars:
 *   DAYTONA_API_KEY   admin key with snapshot.create permissions
 *   DAYTONA_API_URL   Daytona API base URL (optional — SDK default used if absent)
 *
 * Usage:
 *   node packages/@n8n/instance-ai/scripts/build-snapshot.mjs --version 1.123.0
 */

import { Daytona } from '@daytonaio/sdk';

import { SnapshotManager } from '@n8n/instance-ai';

function parseVersion(argv) {
	const flagIdx = argv.indexOf('--version');
	if (flagIdx !== -1 && argv[flagIdx + 1]) return argv[flagIdx + 1];
	for (const arg of argv) {
		if (arg.startsWith('--version=')) return arg.slice('--version='.length);
	}
	return process.env.N8N_VERSION;
}

const consoleLogger = {
	info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, ...meta })),
	warn: (msg, meta) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta })),
	error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, ...meta })),
	debug: () => {},
};

function isAlreadyExistsError(error) {
	if (!error) return false;
	if (error.statusCode === 409) return true;
	const msg = error.message || String(error);
	return /already exists/i.test(msg);
}

async function main() {
	const version = parseVersion(process.argv.slice(2));
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

	const daytona = new Daytona({ apiKey, apiUrl });
	const baseImage = process.env.SANDBOX_IMAGE || undefined;
	const manager = new SnapshotManager(baseImage, consoleLogger, version);
	const name = `n8n-instance-ai-${version}`;
	const image = manager.ensureImage();

	consoleLogger.info('Creating Daytona snapshot', { name });

	try {
		await daytona.snapshot.create(
			{ name, image },
			{ timeout: 1800, onLogs: (chunk) => process.stdout.write(`${chunk}\n`) },
		);
		consoleLogger.info('Snapshot created', { name });
	} catch (error) {
		if (isAlreadyExistsError(error)) {
			consoleLogger.info('Snapshot already exists — treating as success', { name });
			return;
		}
		consoleLogger.error('Snapshot creation failed', {
			name,
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	}
}

main().catch((error) => {
	consoleLogger.error('Unexpected error during snapshot build', {
		error: error instanceof Error ? error.message : String(error),
	});
	process.exit(1);
});
