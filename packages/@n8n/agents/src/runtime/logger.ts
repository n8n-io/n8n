/**
 * Filtered logger that suppresses known noisy warnings from the runtime.
 * All other messages are forwarded to console.
 */

const SUPPRESSED_PATTERNS = [
	'No memory is configured but resourceId and threadId were passed in args',
];

function isSuppressed(message: string): boolean {
	return SUPPRESSED_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Creates a logger that drops messages matching known suppressed patterns
 * and forwards everything else to console.
 */
export function createFilteredLogger() {
	return {
		debug(message: string, ...args: unknown[]) {
			if (!isSuppressed(message)) console.debug(message, ...args);
		},
		info(message: string, ...args: unknown[]) {
			if (!isSuppressed(message)) console.info(message, ...args);
		},
		warn(message: string, ...args: unknown[]) {
			if (!isSuppressed(message)) console.warn(message, ...args);
		},
		error(message: string, ...args: unknown[]) {
			if (!isSuppressed(message)) console.error(message, ...args);
		},
		trackException() {},
		getTransports() {
			return new Map();
		},
		// eslint-disable-next-line @typescript-eslint/require-await
		async listLogs() {
			return { logs: [] as unknown[], total: 0, page: 1, perPage: 100, hasMore: false };
		},
		// eslint-disable-next-line @typescript-eslint/require-await
		async listLogsByRunId() {
			return { logs: [] as unknown[], total: 0, page: 1, perPage: 100, hasMore: false };
		},
	};
}
