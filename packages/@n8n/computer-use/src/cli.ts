#!/usr/bin/env node

import { confirm } from '@inquirer/prompts';
import * as fs from 'node:fs/promises';

import { parseConfig } from './config';
import { cliConfirmResourceAccess, sanitizeForTerminal } from './confirm-resource-cli';
import { startDaemon } from './daemon';
import { GatewayClient } from './gateway-client';
import {
	configure,
	logger,
	printBanner,
	printConnected,
	printModuleStatus,
	printToolList,
} from './logger';
import { SettingsStore } from './settings-store';
import { applyTemplate, runStartupConfigCli } from './startup-config-cli';
import type { ConfirmResourceAccess } from './tools/types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function cliConfirmConnect(url: string): Promise<boolean> {
	return await confirm({ message: `Allow connection to ${sanitizeForTerminal(url)}?` });
}

function makeConfirmConnect(
	nonInteractive: boolean,
	autoConfirm: boolean,
): (url: string) => Promise<boolean> | boolean {
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
// Serve (daemon) mode
// ---------------------------------------------------------------------------

async function tryServe(): Promise<boolean> {
	const parsed = parseConfig();
	if (parsed.command !== 'serve') return false;

	configure({ level: parsed.config.logLevel });
	printBanner();

	// Non-interactive: apply recommended template as explicit defaults (shell/computer stay deny
	// unless overridden via --permission-* flags), then skip all interactive prompts.
	const config = parsed.nonInteractive
		? applyTemplate(parsed.config, 'default')
		: await runStartupConfigCli(parsed.config);

	startDaemon(config, {
		confirmConnect: makeConfirmConnect(parsed.nonInteractive, parsed.autoConfirm),
		confirmResourceAccess: makeConfirmResourceAccess(parsed.nonInteractive, parsed.autoConfirm),
	});
	return true;
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
  npx @n8n/computer-use serve [directory] [options]
  npx @n8n/computer-use <url> <token> [directory] [options]
  npx @n8n/computer-use --url <url> --api-key <token> [options]

Commands:
  serve      Start a local daemon that n8n auto-detects

Positional arguments:
  url        n8n instance URL (e.g. https://my-n8n.com)
  token      Gateway token (from "Connect local files" UI)
  directory  Local directory to share (default: current directory)

Global options:
  --log-level <level>       Log level: silent, error, warn, info, debug (default: info)
  --allow-origin <url>      Allow connections from this URL without confirmation (repeatable)
  -p, --port <port>         Daemon port (default: 7655, serve mode only)
  --non-interactive         Skip all prompts (deny per default); use defaults + env/cli overrides
  --auto-confirm            Auto-confirm all prompts (no readline)
  -h, --help                Show this help message

Filesystem:
  --filesystem-dir <path>   Root directory for filesystem tools (default: .)

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
  All options can be set via N8N_GATEWAY_* environment variables.
  Example: N8N_GATEWAY_BROWSER_DEFAULT=chrome
  See README.md for the full list.
`);
}

// ---------------------------------------------------------------------------
// Main (direct connection mode)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const parsed = parseConfig();
	configure({ level: parsed.config.logLevel });

	printBanner();

	if (!parsed.url || !parsed.apiKey) {
		logger.error('Missing required arguments: url and token');
		printUsage();
		process.exit(1);
	}

	const config = parsed.nonInteractive
		? applyTemplate(parsed.config, 'default')
		: await runStartupConfigCli(parsed.config);

	// Validate filesystem directory exists
	const dir = config.filesystem.dir;
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

	printModuleStatus(config);

	const settingsStore = await SettingsStore.create(config);

	const client = new GatewayClient({
		url: parsed.url,
		apiKey: parsed.apiKey,
		config,
		settingsStore,
		confirmResourceAccess: makeConfirmResourceAccess(parsed.nonInteractive, parsed.autoConfirm),
	});

	const shutdown = () => {
		logger.info('Shutting down');
		void Promise.all([client.disconnect(), settingsStore.flush()]).finally(() => {
			process.exit(0);
		});
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	await client.start();

	printConnected(parsed.url);
	printToolList(client.tools);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

void (async () => {
	if (shouldShowHelp()) {
		printUsage();
		process.exit(0);
	}

	if (await tryServe()) return;

	await main();
})().catch((error: unknown) => {
	logger.error('Fatal error', {
		error: error instanceof Error ? error.message : String(error),
	});
	process.exit(1);
});
