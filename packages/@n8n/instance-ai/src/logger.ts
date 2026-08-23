/** Minimal logger contract — structurally compatible with @n8n/backend-common Logger. */
export interface Logger {
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
	error(message: string, metadata?: Record<string, unknown>): void;
	debug(message: string, metadata?: Record<string, unknown>): void;
}

/**
 * Minimal error-reporter contract — structurally compatible with the n8n-core
 * `ErrorReporter`. Wired to Sentry by the cli layer; defaults to a no-op when
 * the package is used standalone (e.g. in CI scripts and tests).
 */
export interface ErrorReporter {
	error(
		error: unknown,
		options?: {
			tags?: Record<string, string>;
			extra?: Record<string, unknown>;
		},
	): void;
}
