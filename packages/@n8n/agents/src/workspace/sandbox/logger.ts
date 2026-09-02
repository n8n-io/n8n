export interface Logger {
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
	error(message: string, metadata?: Record<string, unknown>): void;
	debug(message: string, metadata?: Record<string, unknown>): void;
}

export interface ErrorReporter {
	error(
		error: unknown,
		options?: {
			tags?: Record<string, string>;
			extra?: Record<string, unknown>;
		},
	): void;
}
