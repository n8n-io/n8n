#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { GatewayClient } from './gateway-client';

interface CliArgs {
	url: string;
	apiKey: string;
	dir: string;
}

/**
 * Handle the `serve` subcommand separately — startDaemon is non-blocking
 * (server.listen is async), so it must run before main() to avoid
 * main() continuing with undefined args.
 */
function tryServe(): boolean {
	const args = process.argv.slice(2);
	if (args[0] !== 'serve') return false;

	let dir = '.';
	let port = 7655;
	for (let i = 1; i < args.length; i++) {
		if (args[i] === '--port') {
			port = Number(args[++i]);
		} else if (!args[i].startsWith('--')) {
			dir = args[i];
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { startDaemon } = require('./daemon') as { startDaemon: (d: string, p: number) => void };
	startDaemon(path.resolve(dir), port);
	return true;
}

// Daemon mode — process stays alive via the HTTP server. Skip main().
if (tryServe()) {
	// noop — server is running
} else {
	void main().catch((error) => {
		console.error('Fatal error:', error instanceof Error ? error.message : String(error));
		process.exit(1);
	});
}

function parseArgs(): CliArgs {
	const args = process.argv.slice(2);

	// Handle --help/-h before anything else
	if (args.includes('--help') || args.includes('-h')) {
		printUsage();
		process.exit(0);
	}

	// Positional syntax: npx @n8n/fs-proxy <url> <token> [dir]
	if (args.length > 0 && !args[0].startsWith('--')) {
		const [url, apiKey, dir] = args;
		if (!url || !apiKey) {
			console.error('Missing required arguments.');
			printUsage();
			process.exit(1);
		}
		return { url: url.replace(/\/$/, ''), apiKey, dir: path.resolve(dir || '.') };
	}

	// Flag syntax: --url <url> --api-key <key> --dir <path>
	let url = '';
	let apiKey = '';
	let dir = '';

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--url':
				url = args[++i] ?? '';
				break;
			case '--api-key':
				apiKey = args[++i] ?? '';
				break;
			case '--dir':
				dir = args[++i] ?? '';
				break;
			default:
				console.error(`Unknown argument: ${args[i]}`);
				printUsage();
				process.exit(1);
		}
	}

	if (!url || !apiKey || !dir) {
		console.error('Missing required arguments.');
		printUsage();
		process.exit(1);
	}

	return { url: url.replace(/\/$/, ''), apiKey, dir: path.resolve(dir) };
}

function printUsage(): void {
	console.log(`
n8n-fs-proxy — Filesystem gateway daemon for n8n Instance AI

Usage:
  npx @n8n/fs-proxy serve [directory] [--port 7655]
  npx @n8n/fs-proxy <url> <token> [directory]
  npx @n8n/fs-proxy --url <url> --api-key <token> --dir <directory>

Commands:
  serve      Start a local daemon that n8n auto-detects (zero-click mode)

Arguments:
  url        n8n instance URL (e.g. https://my-n8n.com)
  token      Gateway token (from "Connect local files" UI or N8N_INSTANCE_AI_GATEWAY_API_KEY)
  directory  Local directory to share (default: current directory)

Options:
  --port     Port for daemon mode (default: 7655)
  --help     Show this help message
`);
}

async function main(): Promise<void> {
	const args = parseArgs();

	// Validate directory exists
	try {
		const stat = await fs.stat(args.dir);
		if (!stat.isDirectory()) {
			console.error(`Error: "${args.dir}" is not a directory`);
			process.exit(1);
		}
	} catch {
		console.error(`Error: Directory "${args.dir}" does not exist`);
		process.exit(1);
	}

	const client = new GatewayClient(args);

	// Graceful shutdown
	const shutdown = () => {
		console.log('\nShutting down...');
		void client.disconnect().finally(() => {
			process.exit(0);
		});
	};
	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	await client.start();
	console.log(`Proxying filesystem requests for: ${args.dir}`);
	console.log('Press Ctrl+C to stop');
}
