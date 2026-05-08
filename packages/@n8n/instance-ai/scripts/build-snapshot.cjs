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
 * The actual create-with-already-exists logic lives in
 * `SnapshotManager.createSnapshot` so the runtime (direct mode) and CI
 * share a single implementation.
 *
 * CommonJS so Node resolves the package via `main: dist/index.js` instead
 * of the bundler-only `module: src/index.ts` entry.
 *
 * Required env vars:
 *   DAYTONA_API_KEY   admin key with snapshot.create permissions
 *   DAYTONA_API_URL   Daytona API base URL (optional — SDK default used if absent)
 *
 * Usage:
 *   node packages/@n8n/instance-ai/scripts/build-snapshot.cjs --version 1.123.0
 */

const { Daytona } = require('@daytonaio/sdk');
const { SnapshotManager } = require('@n8n/instance-ai');

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

	const name = await manager.createSnapshot(daytona, {
		timeout: 1800,
		onLogs: (chunk) => process.stdout.write(`${chunk}\n`),
	});

	consoleLogger.info('Snapshot ready', { name });
}

main().catch((error) => {
	consoleLogger.error('Snapshot creation failed', {
		error: error instanceof Error ? error.message : String(error),
	});
	process.exit(1);
});
