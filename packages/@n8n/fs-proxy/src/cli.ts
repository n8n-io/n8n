#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import type { Server } from 'node:http';

import { parseConfig } from './config';
import { GatewayClient } from './gateway-client';
import { configure, logger, printBanner, printConnected, printToolList } from './logger';

// ── Serve (daemon) mode ─────────────────────────────────────────────────────

function tryServe(): boolean {
	const parsed = parseConfig();

	if (parsed.command !== 'serve') return false;

	configure({ level: parsed.config.logLevel });

	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { startDaemon } = require('./daemon') as {
		startDaemon: (config: typeof parsed.config) => Server;
	};
	startDaemon(parsed.config);
	return true;
}

// ── Help ────────────────────────────────────────────────────────────────────

function shouldShowHelp(): boolean {
	const args = process.argv.slice(2);
	return args.includes('--help') || args.includes('-h');
}

function printUsage(): void {
	console.log(`
n8n-fs-proxy — Local AI gateway for n8n Instance AI

Usage:
  npx @n8n/fs-proxy serve [directory] [options]
  npx @n8n/fs-proxy <url> <token> [directory] [options]
  npx @n8n/fs-proxy --url <url> --api-key <token> [options]

Commands:
  serve      Start a local daemon that n8n auto-detects (zero-click mode)

Positional arguments:
  url        n8n instance URL (e.g. https://my-n8n.com)
  token      Gateway token (from "Connect local files" UI)
  directory  Local directory to share (default: current directory)

Global options:
  --log-level <level>       Log level: silent, error, warn, info, debug (default: info)
  --allow-origin <url>          Allow connections from this URL without confirmation (repeatable)
  -p, --port <port>         Daemon port (default: 7655, serve mode only)
  -h, --help                Show this help message

Filesystem:
  --filesystem-dir <path>   Root directory for filesystem tools (default: .)
  --no-filesystem           Disable filesystem tools

Computer use:
  --no-computer-shell                Disable shell tool
  --computer-shell-timeout <ms>      Shell command timeout (default: 30000)
  --no-computer-screenshot           Disable screenshot tools
  --no-computer-mouse-keyboard       Disable mouse/keyboard tools

Browser:
  --no-browser                       Disable browser tools
  --browser-headless                 Run browser in headless mode (default: false)
  --no-browser-headless              Run browser with visible window
  --browser-default <name>           Default browser (default: chromium)
  --browser-viewport <WxH>           Viewport size (default: 1280x720)
  --browser-session-ttl-ms <ms>      Session idle timeout (default: 1800000)
  --browser-max-sessions <n>         Max concurrent sessions (default: 5)

Environment variables:
  All options can be set via N8N_GATEWAY_* environment variables.
  Example: N8N_GATEWAY_BROWSER_HEADLESS=false
  See README.md for the full list.
`);
}

// ── Main ────────────────────────────────────────────────────────────────────

if (shouldShowHelp()) {
	printUsage();
	process.exit(0);
}

// Daemon mode — process stays alive via the HTTP server. Skip main().
if (tryServe()) {
	// noop — server is running
} else {
	void main().catch((error) => {
		logger.error('Fatal error', {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}

async function main(): Promise<void> {
	const parsed = parseConfig();
	configure({ level: parsed.config.logLevel });

	printBanner();

	if (!parsed.url || !parsed.apiKey) {
		logger.error('Missing required arguments: url and token');
		printUsage();
		process.exit(1);
	}

	// Validate filesystem directory exists (if filesystem is enabled)
	if (parsed.config.filesystem !== false) {
		const dir = parsed.config.filesystem.dir;
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
	}

	const client = new GatewayClient({
		url: parsed.url,
		apiKey: parsed.apiKey,
		config: parsed.config,
	});

	// Graceful shutdown
	const shutdown = () => {
		logger.info('Shutting down');
		void client.disconnect().finally(() => {
			process.exit(0);
		});
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	await client.start();

	printConnected(parsed.url);
	printToolList(client.tools);
}
