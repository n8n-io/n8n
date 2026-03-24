import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import pc from 'picocolors';

import type { ResolvedGatewayConfig } from './config';
import type { ToolDefinition } from './tools/types';

// ── Logger core ──────────────────────────────────────────────────────────────

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_RANK: Record<LogLevel, number> = {
	silent: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
};

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;
const stripAnsi = (s: string) => s.replace(ANSI_RE, '');

let currentLevel: LogLevel = 'info';

export function configure(options: { level?: LogLevel }): void {
	currentLevel = options.level ?? 'info';
}

function isEnabled(level: LogLevel): boolean {
	return LEVEL_RANK[level] <= LEVEL_RANK[currentLevel];
}

function formatMeta(meta: Record<string, unknown>): string {
	if (Object.keys(meta).length === 0) return '';
	return ' ' + JSON.stringify(meta);
}

/** Append metadata to console output only in debug mode; file log always gets it. */
function consoleMetaSuffix(meta: Record<string, unknown>): string {
	return currentLevel === 'debug' ? formatMeta(meta) : '';
}

function formatMessage(message: string): string {
	return currentLevel === 'debug' ? stripAnsi(message) : message;
}

// ── File logging ──────────────────────────────────────────────────────────────

const LOG_DIR = path.join(os.homedir(), '.n8n-local-gateway');
const LOG_FILE = path.join(LOG_DIR, 'log');

let fileWriterReady = false;

function ensureLogFile(): boolean {
	if (fileWriterReady) return true;
	try {
		fs.mkdirSync(LOG_DIR, { recursive: true });
		fileWriterReady = true;
		return true;
	} catch {
		return false;
	}
}

function writeToFile(level: LogLevel, message: string, meta: Record<string, unknown>): void {
	if (!ensureLogFile()) return;
	try {
		const ts = new Date().toISOString();
		const lvl = level.toUpperCase().padEnd(5);
		const cleanMsg = stripAnsi(message);
		const metaPart = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
		fs.appendFileSync(LOG_FILE, `[${ts}] [${lvl}] ${cleanMsg}${metaPart}\n`);
	} catch {
		// silently ignore file write failures
	}
}

export const logger = {
	error(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('error')) {
			console.error(formatMessage(message) + consoleMetaSuffix(meta));
			writeToFile('error', message, meta);
		}
	},
	warn(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('warn')) {
			console.warn(formatMessage(message) + consoleMetaSuffix(meta));
			writeToFile('warn', message, meta);
		}
	},
	info(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('info')) {
			console.log(formatMessage(message) + consoleMetaSuffix(meta));
			writeToFile('info', message, meta);
		}
	},
	debug(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('debug')) {
			console.log(formatMessage(message) + formatMeta(meta));
			writeToFile('debug', message, meta);
		}
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
		const writeAccess = config.filesystem.writeAccess ? ', write access' : '';
		logger.info(`  ${pc.green('✓')} Filesystem    ${pc.dim(dir + writeAccess)}`, {
			module: 'Filesystem',
			dir,
			writeAccess: config.filesystem.writeAccess,
		});
		if (writeAccess) {
			logger.info(`  ${pc.green('✓')} Filesystem write access`);
		} else {
			logger.info(pc.dim('  ✗ Filesystem write access'));
		}
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

export function printReconnecting(reason?: string): void {
	const suffix = reason ? ` ${pc.dim(reason)}` : '';
	logger.warn(`  ${pc.yellow('●')} Reconnecting${suffix}`);
}

export function printAuthFailure(): void {
	logger.error(`  ${pc.red('✗')} Authentication failed — waiting for new pairing token`);
}

export function printReinitializing(): void {
	logger.info(`  ${pc.magenta('▸')} Re-initializing gateway connection`);
}

export function printReinitFailed(error: string): void {
	const msg = error.length > 80 ? error.slice(0, 77) + '...' : error;
	logger.error(`  ${pc.red('✗')} Re-initialization failed ${pc.dim(msg)}`);
}

export function printShuttingDown(): void {
	logger.info(`  ${pc.yellow('●')} Shutting down`);
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

const FILESYSTEM_TOOLS = new Set([
	'read_file',
	'list_files',
	'get_file_tree',
	'search_files',
	'write_file',
	'edit_file',
	'create_directory',
	'delete',
	'move',
	'copy_file',
]);

function categorize(toolName: string): string {
	if (FILESYSTEM_TOOLS.has(toolName)) return 'Filesystem';
	if (toolName === 'shell_execute') return 'Shell';
	if (toolName.startsWith('screen_')) return 'Screenshot';
	if (toolName.startsWith('mouse_') || toolName.startsWith('keyboard_')) return 'Mouse/keyboard';
	if (toolName.startsWith('browser_')) return 'Browser';
	return 'Other';
}
