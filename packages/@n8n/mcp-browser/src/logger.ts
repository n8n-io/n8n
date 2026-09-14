/** Tagged logger with log-level filtering for the mcp-browser package. */

import pc from 'picocolors';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_RANK: Record<LogLevel, number> = {
	silent: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
};

let currentLevel: LogLevel = 'info';

export function configureLogger(options: { level?: LogLevel }): void {
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
		.replace(/:/g, ': ')
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
	return [ts, lvl, color(message) + suffix].join(separator);
}

function parseArgs(
	args: unknown[],
	tag: string,
): { message: string; meta: Record<string, unknown> } {
	const meta: Record<string, unknown> = { scope: tag };
	const messageParts: string[] = [];
	for (const arg of args) {
		if (typeof arg === 'object' && arg !== null && !Array.isArray(arg) && !(arg instanceof Error)) {
			Object.assign(meta, arg);
		} else {
			messageParts.push(String(arg));
		}
	}
	return { message: messageParts.join(' '), meta };
}

export function createLogger(tag: string) {
	const prefix = `[mcp-browser:${tag}]`;

	function log(level: LogLevel, consoleFn: (...args: unknown[]) => void, args: unknown[]): void {
		if (!isEnabled(level)) return;
		if (currentLevel === 'debug') {
			const { message, meta } = parseArgs(args, tag);
			consoleFn(devDebugLine(level, message, meta));
		} else {
			consoleFn(prefix, ...args);
		}
	}

	return {
		error: (...args: unknown[]) => log('error', console.error, args),
		warn: (...args: unknown[]) => log('warn', console.warn, args),
		info: (...args: unknown[]) => log('info', console.log, args),
		debug: (...args: unknown[]) => log('debug', console.log, args),
	};
}
