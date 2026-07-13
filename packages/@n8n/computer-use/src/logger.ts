import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import pc from 'picocolors';

import type { GatewayConfig, PermissionMode } from './config';
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

// ── Debug format (matches backend-common dev console) ────────────────────────

function devTimestamp(): string {
	const now = new Date();
	const pad = (num: number, digits = 2) => num.toString().padStart(digits, '0');
	return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

function toPrintable(metadata: Record<string, unknown>): string {
	if (Object.keys(metadata).length === 0) return '';
	return JSON.stringify(metadata)
		.replace(/{"/g, '{ "')
		.replace(/,"/g, ', "')
		.replace(/":/g, '": ')
		.replace(/}/g, ' }');
}

const LEVEL_COLORS: Record<string, (s: string) => string> = {
	error: pc.red,
	warn: pc.yellow,
	info: pc.green,
	debug: pc.blue,
};

function colorFor(level: string): (s: string) => string {
	return LEVEL_COLORS[level] ?? ((s: string) => s);
}

function devDebugLine(level: string, message: string, meta: Record<string, unknown>): string {
	const separator = '   ';
	const ts = devTimestamp();
	const color = colorFor(level);
	const lvl = color(level).padEnd(15); // 15 accounts for ANSI color codes
	const metaStr = toPrintable(meta);
	const suffix = metaStr ? ' ' + pc.dim(metaStr) : '';
	return [ts, lvl, color(stripAnsi(message)) + suffix].join(separator);
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
			console.error(currentLevel === 'debug' ? devDebugLine('error', message, meta) : message);
			writeToFile('error', message, meta);
		}
	},
	warn(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('warn')) {
			console.warn(currentLevel === 'debug' ? devDebugLine('warn', message, meta) : message);
			writeToFile('warn', message, meta);
		}
	},
	info(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('info')) {
			console.log(currentLevel === 'debug' ? devDebugLine('info', message, meta) : message);
			writeToFile('info', message, meta);
		}
	},
	debug(message: string, meta: Record<string, unknown> = {}) {
		if (isEnabled('debug')) {
			console.log(devDebugLine('debug', message, meta));
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
	'                   ',
];

const SUBTITLE = [
	'                                     __',
	'   _________  ____ ___  ____  __  __/ /____  _____   __  __________',
	'  / ___/ __ \\/ __ `__ \\/ __ \\/ / / / __/ _ \\/ ___/  / / / / ___/ _ \\',
	' / /__/ /_/ / / / / / / /_/ / /_/ / /_/  __/ /     / /_/ (__  )  __/',
	' \\___/\\____/_/ /_/ /_/ .___/\\__,_/\\__/\\___/_/      \\__,_/____/\\___/',
	'                    /_/',
];

/** Print the ASCII art startup banner. Always pretty, bypasses the logger. */
export function printBanner(): void {
	console.log();
	for (let i = 0; i < LOGO.length; i++) {
		console.log(pc.magenta(LOGO[i]) + pc.dim(SUBTITLE[i]));
	}
	console.log();
}

// ── Pretty output functions ──────────────────────────────────────────────────

function permissionIcon(mode: PermissionMode): string {
	if (mode === 'allow') return pc.green('✓');
	if (mode === 'ask') return pc.yellow('?');
	return pc.dim('✗');
}

/**
 * Print the module overview. Pass resolved `categories` (from the gateway) so
 * runtime-gated modules (shell sandbox, native computer modules) reflect their
 * actual state; without them it falls back to the permission modes alone.
 */
export function printModuleStatus(
	config: GatewayConfig,
	categories?: Array<{ name: string; enabled: boolean; writeAccess?: boolean }>,
): void {
	const { permissions } = config;
	const isOn = (category: string, fallback: boolean) =>
		categories ? (categories.find((c) => c.name === category)?.enabled ?? false) : fallback;
	const icon = (mode: PermissionMode, enabled: boolean) =>
		enabled ? permissionIcon(mode) : pc.dim('✗');
	const row = (iconStr: string, label: string, value: string) =>
		`  ${iconStr} ${label.padEnd(16)} ${value}`;
	const disabled = pc.dim('(disabled)');
	const dir = pc.dim(formatPath(config.filesystem.dir));

	// Filesystem — permission-only, no runtime gating
	const fsRead = permissions.filesystemRead ?? 'deny';
	const fsWrite: PermissionMode =
		fsRead === 'deny' ? 'deny' : (permissions.filesystemWrite ?? 'deny');
	logger.info(row(permissionIcon(fsRead), 'Filesystem read', fsRead !== 'deny' ? dir : disabled), {
		module: 'FilesystemRead',
	});
	logger.info(
		row(permissionIcon(fsWrite), 'Filesystem write', fsWrite !== 'deny' ? dir : disabled),
		{ module: 'FilesystemWrite' },
	);

	// Shell — gated by the OS sandbox at runtime
	const shellMode = permissions.shell ?? 'deny';
	const shellOn = isOn('shell', shellMode !== 'deny');
	logger.info(
		row(
			icon(shellMode, shellOn),
			'Shell',
			shellOn ? pc.dim(`timeout: ${config.computer.shell.timeout / 1000}s`) : disabled,
		),
		{ module: 'Shell' },
	);

	// Computer — Screenshot + Mouse/keyboard, gated by native modules at runtime
	const computerMode = permissions.computer ?? 'deny';
	const screenshotOn = isOn('screenshot', computerMode !== 'deny');
	const mouseKeyboardOn = isOn('mouse-keyboard', computerMode !== 'deny');
	logger.info(row(icon(computerMode, screenshotOn), 'Screenshot', screenshotOn ? '' : disabled), {
		module: 'Screenshot',
	});
	logger.info(
		row(icon(computerMode, mouseKeyboardOn), 'Mouse/keyboard', mouseKeyboardOn ? '' : disabled),
		{ module: 'MouseKeyboard' },
	);

	// Browser
	const browserMode = permissions.browser ?? 'deny';
	const browserOn = isOn('browser', browserMode !== 'deny');
	logger.info(
		row(
			icon(browserMode, browserOn),
			'Browser',
			browserOn ? pc.dim(config.browser.defaultBrowser) : disabled,
		),
		{ module: 'Browser' },
	);

	logger.info('');
}

/**
 * Report permitted modules that couldn't activate, with why + how to fix.
 * Printed as visible lines (the logger only surfaces metadata at debug level);
 * hints may be multi-line and each line is shown indented.
 */
export function printModuleDiagnostics(
	modules: Array<{ name: string; reason: string; hint?: string }>,
): void {
	if (modules.length === 0) return;
	for (const { name, reason, hint } of modules) {
		logger.warn(`  ${pc.yellow('⚠')} ${name}`, { module: name, reason, ...(hint ? { hint } : {}) });
		logger.warn(`      ${pc.dim(reason)}`);
		for (const line of hint?.split('\n') ?? []) {
			logger.warn(`      ${pc.dim(line)}`);
		}
	}
	logger.warn('');
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
	logger.info(`\n  ${pc.green('●')} Connected to ${pc.bold(url)}\n`, { url });
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

export function printInvalidToken(url: string): void {
	logger.error(`\n  ${pc.red('✗')} Connection token invalid`);
	logger.error(
		`    ${pc.dim(`Go to ${url} and reconnect n8n Computer Use using a new connection token`)}\n`,
	);
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
