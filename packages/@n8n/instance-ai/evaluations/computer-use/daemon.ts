// ---------------------------------------------------------------------------
// Daemon probe + optional auto-start.
//
// External-daemon model: the eval expects a long-lived `@n8n/computer-use`
// daemon to be running and paired with the local n8n instance. If one isn't
// detected and `autoStart` is true, we spawn it ourselves — detached, with
// stdout/stderr piped to `.eval-output/daemon.log`. The daemon survives the
// eval process so subsequent runs reuse the same browser session and any
// allow-once decisions the user has accumulated.
//
// By default we spawn the local workspace build of `@n8n/computer-use` so the
// daemon picks up in-progress changes to that package and its workspace
// dependencies (`@n8n/mcp-browser` etc.). Pass `usePublishedDaemon: true` to
// fall back to `npx --yes @n8n/computer-use` for testing the released
// artifact end-to-end.
// ---------------------------------------------------------------------------

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { appendFile, mkdir, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';

const LOCAL_COMPUTER_USE_CLI = resolve(
	__dirname,
	'../../../../../packages/@n8n/computer-use/dist/cli.js',
);

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
	/**
	 * When true, spawn the published `@n8n/computer-use` from npm via `npx`
	 * instead of the local workspace build. Use this to test the released
	 * artifact end-to-end. Defaults to false (local build).
	 */
	usePublishedDaemon?: boolean;
}

export async function ensureDaemon(opts: EnsureDaemonOptions): Promise<DaemonInfo> {
	const { client, logger } = opts;

	let status = await client.getGatewayStatus();
	if (status.connected && status.directory) {
		logger.verbose(`[daemon] already paired, dir=${status.directory}`);
		// Auto-connect (N8N_EVAL_AUTO_BROWSER_CONNECT=1) is set on the daemon's
		// own process env at spawn-time, so it only takes effect when the eval
		// runner started the daemon. A pre-existing daemon won't have it.
		logger.warn(
			'Reusing existing computer-use daemon. If it was not started by this eval runner, ' +
				'browser auto-connect may be inactive — you may need to click Connect in the ' +
				'extension manually when the browser session resets between scenarios.',
		);
		return toInfo(status);
	}

	if (!opts.autoStart) {
		throw new Error(noDaemonHint(opts.baseUrl));
	}

	const usePublished = opts.usePublishedDaemon ?? false;
	if (!usePublished && !existsSync(LOCAL_COMPUTER_USE_CLI)) {
		throw new Error(
			`Local computer-use build not found at ${LOCAL_COMPUTER_USE_CLI}.\n` +
				'Build it first:\n' +
				'  pnpm --filter @n8n/computer-use --filter @n8n/mcp-browser build\n' +
				'\n' +
				'Or pass --use-published-daemon to spawn the released package via npx instead.',
		);
	}

	const sandboxDir = opts.daemonSandboxDir ?? join(opts.evalOutputDir, 'daemon-sandbox');
	await mkdir(sandboxDir, { recursive: true });

	const logPath = join(opts.evalOutputDir, 'daemon.log');
	const { token } = await client.createGatewayLink();

	logger.info(
		`Daemon not running — auto-starting (${usePublished ? 'published via npx' : 'local workspace build'}, sandbox: ${sandboxDir})`,
	);
	const pid = await spawnDaemonDetached({
		baseUrl: opts.baseUrl,
		token,
		sandboxDir,
		logPath,
		usePublished,
		logger,
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
	usePublished: boolean;
	logger: EvalLogger;
}

async function spawnDaemonDetached(args: SpawnArgs): Promise<number> {
	const logFile = await open(args.logPath, 'a');
	try {
		const daemonArgs = [
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
		];

		const [command, commandArgs] = args.usePublished
			? ['npx', ['--yes', '@n8n/computer-use', ...daemonArgs]]
			: [process.execPath, [LOCAL_COMPUTER_USE_CLI, ...daemonArgs]];

		const child = spawn(command, commandArgs, {
			detached: true,
			stdio: ['ignore', logFile.fd, logFile.fd],
			// `N8N_EVAL_AUTO_BROWSER_CONNECT=1` makes the mcp-browser playwright
			// adapter append `autoConnect=1` to the extension's connect URL, so
			// the UI clicks Connect itself between scenarios. Avoids the manual
			// click each time `browser_disconnect` resets the session at the end
			// of a credential-setup orchestration run.
			env: { ...process.env, FORCE_COLOR: '0', N8N_EVAL_AUTO_BROWSER_CONNECT: '1' },
		});

		// `spawn` reports failures asynchronously via 'error' (e.g. ENOENT when the
		// command isn't on PATH). With a detached/unref'd child, an unhandled
		// 'error' event would crash the parent. Surface the failure in both the
		// daemon log and the eval logger so the pairing-poll timeout that follows
		// has a real cause attached, rather than just timing out silently.
		child.once('error', (error: Error) => {
			const message = `[daemon] spawn failed (${command}): ${error.message}\n`;
			args.logger.error(`Failed to spawn daemon (${command}): ${error.message}`);
			void appendFile(args.logPath, message).catch(() => {});
		});

		if (child.pid === undefined) {
			throw new Error(
				`Failed to spawn daemon: \`${command}\` did not start. See ${args.logPath} for details.`,
			);
		}
		child.unref();
		return child.pid;
	} finally {
		await logFile.close();
	}
}
