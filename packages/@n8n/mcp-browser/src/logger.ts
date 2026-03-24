/** Tagged logger with log-level filtering for the mcp-browser package. */

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

export function createLogger(tag: string) {
	const prefix = `[mcp-browser:${tag}]`;
	return {
		error: (...args: unknown[]) => {
			if (isEnabled('error')) console.error(prefix, ...args);
		},
		warn: (...args: unknown[]) => {
			if (isEnabled('warn')) console.warn(prefix, ...args);
		},
		info: (...args: unknown[]) => {
			if (isEnabled('info')) console.log(prefix, ...args);
		},
		debug: (...args: unknown[]) => {
			if (isEnabled('debug')) console.log(prefix, ...args);
		},
	};
}
