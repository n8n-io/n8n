#!/usr/bin/env node

import { select } from '@inquirer/prompts';
import * as fs from 'node:fs/promises';

import { parseConfig } from './config';
import { cliConfirmResourceAccess, sanitizeForTerminal } from './confirm-resource-cli';
import { isOriginAllowed, startDaemon } from './daemon';
import { GatewayClient } from './gateway-client';
import { GatewaySession } from './gateway-session';
import {
	configure,
	logger,
	printBanner,
	printConnected,
	printModuleStatus,
	printToolList,
} from './logger';
import { SettingsStore } from './settings-store';
import {
	editPermissions,
	ensureSettingsFile,
	isAllDeny,
	printPermissionsTable,
	promptFilesystemDir,
} from './startup-config-cli';
import type { ConfirmResourceAccess } from './tools/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function cliConfirmConnect(url: string, session: GatewaySession): Promise<boolean> {
	console.log(`\n  Connecting to ${sanitizeForTerminal(url)}\n`);
	printPermissionsTable(session.getAllPermissions());
	console.log(`  Working directory: ${session.dir}\n`);

	const choice = await select({
		message: 'Allow connection?',
		choices: [
			{ name: 'Yes', value: 'yes' },
			{ name: 'Edit permissions / directory', value: 'edit' },
			{ name: 'No', value: 'no' },
		],
	});

	if (choice === 'no') return false;

	if (choice === 'edit') {
		let permissions = session.getAllPermissions();
		do {
			permissions = await editPermissions(permissions);
			if (isAllDeny(permissions)) {
				console.log('\n  At least one capability must be Ask or Allow.\n');
			}
		} while (isAllDeny(permissions));

		const filesystemActive =
			permissions.filesystemRead !== 'deny' || permissions.filesystemWrite !== 'deny';
		const dir = filesystemActive ? await promptFilesystemDir(session.dir) : session.dir;

		session.setPermissions(permissions);
		session.setDir(dir);
	}

	return true;
}

function makeConfirmConnect(
	nonInteractive: boolean,
	autoConfirm: boolean,
): (url: string, session: GatewaySession) => Promise<boolean> | boolean {
	if (autoConfirm) return () => true;
	if (nonInteractive) return () => false;
	return cliConfirmConnect;
}

/**
 * Select the confirmResourceAccess callback based on the interactive/auto-confirm flags.
 *
 *   nonInteractive=false, autoConfirm=false → interactive readline prompt
 *   nonInteractive=false, autoConfirm=true  → silent allowOnce
 *   nonInteractive=true,  autoConfirm=false → silent denyOnce  (safe unattended default)
 *   nonInteractive=true,  autoConfirm=true  → silent allowOnce
 */
function makeConfirmResourceAccess(
	nonInteractive: boolean,
	autoConfirm: boolean,
): ConfirmResourceAccess {
	if (autoConfirm) return () => 'allowOnce';
	if (nonInteractive) return () => 'denyOnce';
	return cliConfirmResourceAccess;
}

// ---------------------------------------------------------------------------
// Daemon mode — URL provided but no token
// ---------------------------------------------------------------------------

async function runDaemon(parsed: ReturnType<typeof parseConfig>, url: string): Promise<void> {
	const { config } = parsed;

	let origin: string;
	try {
		origin = new URL(url).origin;
	} catch {
		logger.error('Invalid instance URL', { url });
		process.exit(1);
	}

	if (!isOriginAllowed(origin, config.allowedOrigins)) {
		logger.error(
			'The provided URL does not match any allowed origin. Use --allowed-origins to configure.',
			{ url, allowedOrigins: config.allowedOrigins },
		);
		process.exit(1);
	}

	// Lock the daemon to accept connections from this specific URL only
	config.allowedOrigins = [url];

	await ensureSettingsFile(config);

	startDaemon(config, {
		confirmConnect: makeConfirmConnect(parsed.nonInteractive, parsed.autoConfirm),
		confirmResourceAccess: makeConfirmResourceAccess(parsed.nonInteractive, parsed.autoConfirm),
	});
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function shouldShowHelp(): boolean {
	const args = process.argv.slice(2);
	return args.includes('--help') || args.includes('-h');
}

function printUsage(): void {
	console.log(`
n8n-computer-use — Local AI gateway for n8n Instance AI

Usage:
  npx @n8n/computer-use <url>                  Start daemon (n8n connects to you)
  npx @n8n/computer-use <url> <token>          Connect directly to n8n instance
  npx @n8n/computer-use <url> <token> <dir>    Connect directly to n8n instance and specify the directory
  npx @n8n/computer-use --url <url> --api-key <token>

Positional arguments:
  url        n8n instance URL (e.g. https://my-instance.app.n8n.cloud)
  token      Gateway token (from "Connect local files" UI) — triggers direct connect

Global options:
  --log-level <level>            Log level: silent, error, warn, info, debug (default: info)
  --allowed-origins <patterns>   Comma-separated allowed origin patterns
                                 (default: https://*.app.n8n.cloud)
  -p, --port <port>              Daemon port (default: 7655, daemon mode only)
  --non-interactive              Skip all prompts (deny per default)
  --auto-confirm                 Auto-confirm all prompts (no readline)
  -h, --help                     Show this help message

Filesystem:
  --dir <path>, -d   Root directory for filesystem tools (default: .)

Permissions (deny | ask | allow):
  --permission-filesystem-read   (default: allow)
  --permission-filesystem-write  (default: ask)
  --permission-shell             (default: deny)
  --permission-computer          (default: deny)
  --permission-browser           (default: ask)

Computer use:
  --computer-shell-timeout <ms>      Shell command timeout (default: 30000)

Browser:
  --no-browser                       Disable browser tools
  --browser-default <name>           Default browser (default: chrome)

Environment variables:
  Most options can be set via N8N_GATEWAY_* environment variables.
  Example: N8N_GATEWAY_BROWSER_DEFAULT=chrome
  Note: --allowed-origins is CLI-only and cannot be set via environment variables.
  See README.md for the full list.
`);
}

// ---------------------------------------------------------------------------
// Main (direct connection mode)
// ---------------------------------------------------------------------------

async function main(
	parsed: ReturnType<typeof parseConfig>,
	url: string,
	apiKey: string,
): Promise<void> {
	await ensureSettingsFile(parsed.config);

	const settingsStore = await SettingsStore.create();
	const defaults = settingsStore.getDefaults(parsed.config);
	const session = new GatewaySession(defaults, settingsStore);

	const confirmConnect = makeConfirmConnect(parsed.nonInteractive, parsed.autoConfirm);
	const approved = await confirmConnect(url, session);
	if (!approved) {
		logger.info('Connection rejected');
		process.exit(0);
	}

	// Validate the directory — re-check for non-interactive mode (already validated
	// interactively in cliConfirmConnect when running in interactive mode).
	const dir = session.dir;
	try {
		const stat = await fs.stat(dir);
		if (!stat.isDirectory()) {
			logger.error('Path is not a directory', { dir });
			process.exit(1);
		}
	} catch {
		logger.error('Directory does not exist', { dir });
		process.exit(1);
	}

	// printModuleStatus expects a GatewayConfig shape — derive one from the session.
	printModuleStatus({
		...parsed.config,
		permissions: session.getAllPermissions(),
		filesystem: { dir: session.dir },
	});

	const client = new GatewayClient({
		url,
		apiKey,
		config: parsed.config,
		session,
		confirmResourceAccess: makeConfirmResourceAccess(parsed.nonInteractive, parsed.autoConfirm),
	});

	const shutdown = () => {
		logger.info('Shutting down');
		void Promise.all([client.disconnect(), session.flush()]).finally(() => {
			process.exit(0);
		});
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	await client.start();

	printConnected(url);
	printToolList(client.tools);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

void (async () => {
	const parsed = parseConfig();
	configure({ level: parsed.config.logLevel });
	printBanner();

	if (shouldShowHelp()) {
		printUsage();
		process.exit(0);
	}

	if (!parsed.url) {
		logger.error('Missing required argument: instance URL');
		printUsage();
		process.exit(1);
	}

	if (!parsed.apiKey) {
		// Daemon mode: URL provided but no token — n8n connects to us
		await runDaemon(parsed, parsed.url);
	} else {
		// Direct connect mode: URL + token provided
		await main(parsed, parsed.url, parsed.apiKey);
	}
})().catch((error: unknown) => {
	logger.error('Fatal error', {
		error: error instanceof Error ? error.message : String(error),
	});
	process.exit(1);
});
