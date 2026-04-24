/** Minimal logger contract — structurally compatible with @n8n/backend-common Logger. */
export interface Logger {
	info(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
	error(message: string, metadata?: Record<string, unknown>): void;
	debug(message: string, metadata?: Record<string, unknown>): void;
}
