// ---------------------------------------------------------------------------
// Daemon probe + optional auto-start.
//
// External-daemon model: the eval expects a long-lived `@n8n/computer-use`
// daemon to be running and paired with the local n8n instance. If one isn't
// detected and `autoStart` is true, we spawn it ourselves — detached, with
// stdout/stderr piped to `.eval-output/daemon.log`. The daemon survives the
// eval process so subsequent runs reuse the same browser session and any
// allow-once decisions the user has accumulated.
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';

const PAIRING_POLL_INTERVAL_MS = 500;
const PAIRING_TIMEOUT_MS = 90_000;

export interface DaemonInfo {
	/** Working directory the daemon is scoped to. */
	directory: string;
	/** Tool category names the daemon advertises. */
	enabledCategories: string[];
}

export interface EnsureDaemonOptions {
	client: N8nClient;
	baseUrl: string;
	logger: EvalLogger;
	/** Where daemon log + auto-spawn sandbox live (under `.eval-output/`). */
	evalOutputDir: string;
	/** When true (default) and no daemon is paired, spawn one. */
	autoStart: boolean;
	/** Override the auto-spawn `--dir`. Defaults to `<evalOutputDir>/daemon-sandbox/`. */
	daemonSandboxDir?: string;
}

export async function ensureDaemon(opts: EnsureDaemonOptions): Promise<DaemonInfo> {
	const { client, logger } = opts;

	let status = await client.getGatewayStatus();
	if (status.connected && status.directory) {
		logger.verbose(`[daemon] already paired, dir=${status.directory}`);
		return toInfo(status);
	}

	if (!opts.autoStart) {
		throw new Error(noDaemonHint(opts.baseUrl));
	}

	const sandboxDir = opts.daemonSandboxDir ?? join(opts.evalOutputDir, 'daemon-sandbox');
	await mkdir(sandboxDir, { recursive: true });

	const logPath = join(opts.evalOutputDir, 'daemon.log');
	const { token } = await client.createGatewayLink();

	logger.info(`Daemon not running — auto-starting (sandbox: ${sandboxDir})`);
	const pid = await spawnDaemonDetached({
		baseUrl: opts.baseUrl,
		token,
		sandboxDir,
		logPath,
	});
	logger.info(`Daemon spawned (pid ${pid}, log: ${logPath})`);
	logger.info('Daemon will keep running after the eval exits — re-runs will reuse it.');

	const deadline = Date.now() + PAIRING_TIMEOUT_MS;
	while (Date.now() < deadline) {
		await delay(PAIRING_POLL_INTERVAL_MS);
		status = await client.getGatewayStatus();
		if (status.connected && status.directory) {
			logger.info(
				`Daemon paired in ${String(Math.round((PAIRING_TIMEOUT_MS - (deadline - Date.now())) / 1000))}s`,
			);
			return toInfo(status);
		}
	}

	throw new Error(
		`Daemon spawned (pid ${pid}) but did not pair within ${String(PAIRING_TIMEOUT_MS / 1000)}s. ` +
			`Check ${logPath} for errors.`,
	);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toInfo(status: {
	directory: string | null;
	toolCategories: Array<{ name: string; enabled: boolean }>;
}): DaemonInfo {
	return {
		directory: status.directory ?? '',
		enabledCategories: (status.toolCategories ?? []).filter((c) => c.enabled).map((c) => c.name),
	};
}

function noDaemonHint(baseUrl: string): string {
	return [
		'No computer-use daemon is paired with this n8n instance.',
		'',
		'Either re-run without `--no-auto-start-daemon`, or start one manually:',
		'',
		`  npx @n8n/computer-use ${baseUrl} \\`,
		'    --dir <path-to-a-dedicated-sandbox-dir> \\',
		'    --auto-confirm \\',
		'    --permission-filesystem-read allow \\',
		'    --permission-filesystem-write allow \\',
		'    --permission-shell allow \\',
		'    --permission-browser allow',
		'',
		'(The daemon prints a pairing token on startup that you paste into the n8n UI once.)',
	].join('\n');
}

interface SpawnArgs {
	baseUrl: string;
	token: string;
	sandboxDir: string;
	logPath: string;
}

async function spawnDaemonDetached(args: SpawnArgs): Promise<number> {
	const logFile = await open(args.logPath, 'a');
	try {
		const child = spawn(
			'npx',
			[
				'--yes',
				'@n8n/computer-use',
				args.baseUrl,
				args.token,
				'--dir',
				args.sandboxDir,
				'--auto-confirm',
				'--allowed-origins',
				args.baseUrl,
				'--permission-filesystem-read',
				'allow',
				'--permission-filesystem-write',
				'allow',
				'--permission-shell',
				'allow',
				'--permission-computer',
				'deny',
				'--permission-browser',
				'allow',
			],
			{
				detached: true,
				stdio: ['ignore', logFile.fd, logFile.fd],
				env: { ...process.env, FORCE_COLOR: '0' },
			},
		);
		child.unref();
		return child.pid ?? -1;
	} finally {
		await logFile.close();
	}
}
