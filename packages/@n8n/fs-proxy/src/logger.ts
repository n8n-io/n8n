import { Logger } from '@n8n/backend-common';
import * as os from 'node:os';
import * as path from 'node:path';
import pc from 'picocolors';

import type { ResolvedGatewayConfig } from './config';
import type { ToolDefinition } from './tools/types';

// ── Logger core ──────────────────────────────────────────────────────────────

type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI_RE, '');

let currentLevel: LogLevel = 'info';
let instance = Logger.create();

export function configure(options: { level?: LogLevel }): void {
	currentLevel = options.level ?? 'info';
	instance = Logger.create(options);
}

function isDebug(): boolean {
	return currentLevel === 'debug';
}

export const logger = {
	error(message: string, meta: Record<string, unknown> = {}) {
		instance.error(isDebug() ? stripAnsi(message) : message, meta);
	},
	warn(message: string, meta: Record<string, unknown> = {}) {
		instance.warn(isDebug() ? stripAnsi(message) : message, meta);
	},
	info(message: string, meta: Record<string, unknown> = {}) {
		instance.info(isDebug() ? stripAnsi(message) : message, meta);
	},
	debug(message: string, meta: Record<string, unknown> = {}) {
		instance.debug(isDebug() ? stripAnsi(message) : message, meta);
	},
};

// ── ASCII art banner ─────────────────────────────────────────────────────────

const LOGO = [
	'        ___        ',
	' _ __  ( _ ) _ __  ',
	"| '_ \\ / _ \\| '_ \\ ",
	'| | | | (_) | | | |',
	'|_| |_|\\___/|_| |_|',
];

const SUBTITLE = [
	'  _                 _               _                           ',
	' | | ___   ___ __ _| |   __ _  __ _| |_ _____      ____ _ _   _ ',
	' | |/ _ \\ / __/ _` | |  / _` |/ _` | __/ _ \\ \\ /\\ / / _` | | | |',
	' | | (_) | (_| (_| | | | (_| | (_| | ||  __/\\ V  V / (_| | |_| |',
	' |_|\\___/ \\___\\__,_|_|  \\__, |\\__,_|\\__\\___| \\_/\\_/ \\__,_|\\__, |',
];

const SUBTITLE_LAST = '                        |___/                             |___/ ';

/** Print the ASCII art startup banner. Always pretty, bypasses the logger. */
export function printBanner(): void {
	console.log();
	for (let i = 0; i < LOGO.length; i++) {
		console.log(pc.magenta(LOGO[i]) + pc.dim(SUBTITLE[i]));
	}
	console.log(' '.repeat(LOGO[0].length) + pc.dim(SUBTITLE_LAST));
	console.log();
}

// ── Pretty output functions ──────────────────────────────────────────────────

export function printModuleStatus(config: ResolvedGatewayConfig): void {
	// Filesystem
	if (config.filesystem !== false) {
		const dir = formatPath(config.filesystem.dir);
		logger.info(`  ${pc.green('✓')} Filesystem    ${pc.dim(dir)}`, { module: 'Filesystem', dir });
	} else {
		logger.info(pc.dim('  ✗ Filesystem'), { module: 'Filesystem', enabled: false });
	}

	// Shell
	if (config.computer.shell !== false) {
		const timeout = `timeout: ${config.computer.shell.timeout / 1000}s`;
		logger.info(`  ${pc.green('✓')} Shell         ${pc.dim(timeout)}`, {
			module: 'Shell',
			timeout,
		});
	} else {
		logger.info(pc.dim('  ✗ Shell'), { module: 'Shell', enabled: false });
	}

	// Screenshot
	if (config.computer.screenshot !== false) {
		logger.info(`  ${pc.green('✓')} Screenshot`, { module: 'Screenshot' });
	} else {
		logger.info(pc.dim('  ✗ Screenshot'), { module: 'Screenshot', enabled: false });
	}

	// Mouse/keyboard
	if (config.computer.mouseKeyboard !== false) {
		logger.info(`  ${pc.green('✓')} Mouse/keyboard`, { module: 'MouseKeyboard' });
	} else {
		logger.info(pc.dim('  ✗ Mouse/keyboard'), { module: 'MouseKeyboard', enabled: false });
	}

	// Browser
	if (config.browser !== false) {
		const { defaultBrowser, viewport } = config.browser;
		const mode = config.browser.headless ? 'headless' : 'headed';
		const detail = `${defaultBrowser}, ${mode}, ${viewport.width}x${viewport.height}`;
		logger.info(`  ${pc.green('✓')} Browser       ${pc.dim(detail)}`, {
			module: 'Browser',
			detail,
		});
	} else {
		logger.info(pc.dim('  ✗ Browser'), { module: 'Browser', enabled: false });
	}

	logger.info('');
}

export function printToolList(tools: ToolDefinition[]): void {
	if (tools.length === 0) return;

	const groups = groupTools(tools);

	logger.info(`  ${pc.bold('Tools')} ${pc.dim(`(${tools.length})`)}`, {
		count: tools.length,
		tools: tools.map((t) => t.name),
	});
	logger.info('');

	for (const [category, names] of groups) {
		logger.info(`  ${pc.magenta(category)} ${pc.dim(`(${names.length})`)}`);
		logger.info(`  ${pc.dim(names.join(', '))}`);
		logger.info('');
	}
}

export function printListening(port: number): void {
	logger.info(`  ${pc.magenta('▸')} Listening on ${pc.bold(`http://localhost:${port}`)}`, {
		port,
	});
	logger.info('');
}

export function printWaiting(): void {
	logger.info(pc.dim('  Waiting for connection...'));
}

export function printConnected(url: string): void {
	logger.info(`  ${pc.green('●')} Connected to ${pc.bold(url)}`, { url });
}

export function printDisconnected(): void {
	logger.info(`  ${pc.yellow('●')} Disconnected`);
}

export function printToolCall(name: string, args: Record<string, unknown>): void {
	const summary = summarizeArgs(args);
	const suffix = summary ? ` ${pc.dim(summary)}` : '';
	logger.info(`  ${pc.magenta('▸')} ${name}${suffix}`, { tool: name, args });
}

export function printToolResult(name: string, durationMs: number, error?: string): void {
	const time = pc.dim(`(${durationMs}ms)`);
	if (error) {
		const msg = error.length > 80 ? error.slice(0, 77) + '...' : error;
		logger.error(`  ${pc.red('✗')} ${name} ${time} ${pc.red(msg)}`, {
			tool: name,
			durationMs,
			error,
		});
	} else {
		logger.info(`  ${pc.green('✓')} ${name} ${time}`, { tool: name, durationMs });
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPath(dir: string): string {
	const home = os.homedir();
	const absolute = path.resolve(dir);
	if (absolute === home) return '~';
	if (absolute.startsWith(home + path.sep)) return '~' + absolute.slice(home.length);
	return absolute;
}

function summarizeArgs(args: Record<string, unknown>): string {
	const parts: string[] = [];
	let len = 0;
	for (const [key, value] of Object.entries(args)) {
		let v = typeof value === 'string' ? value : JSON.stringify(value);
		if (v.length > 40) v = v.slice(0, 37) + '...';
		const part = `${key}=${v}`;
		if (len + part.length > 80) break;
		parts.push(part);
		len += part.length + 1;
	}
	return parts.join(' ');
}

function groupTools(tools: ToolDefinition[]): Array<[string, string[]]> {
	const categories: Record<string, string[]> = {};

	for (const tool of tools) {
		const category = categorize(tool.name);
		if (!categories[category]) categories[category] = [];
		categories[category].push(tool.name);
	}

	const order = ['Filesystem', 'Shell', 'Screenshot', 'Mouse/keyboard', 'Browser'];
	const sorted: Array<[string, string[]]> = [];

	for (const cat of order) {
		if (categories[cat]) {
			sorted.push([cat, categories[cat]]);
			delete categories[cat];
		}
	}

	for (const [cat, names] of Object.entries(categories)) {
		sorted.push([cat, names]);
	}

	return sorted;
}

const FILESYSTEM_TOOLS = new Set(['read_file', 'list_files', 'get_file_tree', 'search_files']);

function categorize(toolName: string): string {
	if (FILESYSTEM_TOOLS.has(toolName)) return 'Filesystem';
	if (toolName === 'shell_execute') return 'Shell';
	if (toolName.startsWith('screen_')) return 'Screenshot';
	if (toolName.startsWith('mouse_') || toolName.startsWith('keyboard_')) return 'Mouse/keyboard';
	if (toolName.startsWith('browser_')) return 'Browser';
	return 'Other';
}
