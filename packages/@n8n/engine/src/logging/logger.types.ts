/**
 * What the engine needs from a logger, and no more.
 *
 * Declared here rather than imported so the engine keeps no runtime dependency
 * on the rest of n8n. `Logger` from `@n8n/backend-common` satisfies this shape
 * already, so an integrated host passes its own scoped logger straight in.
 */
export interface EngineLogger {
	error(message: string, metadata?: Record<string, unknown>): void;
	warn(message: string, metadata?: Record<string, unknown>): void;
	info(message: string, metadata?: Record<string, unknown>): void;
	debug(message: string, metadata?: Record<string, unknown>): void;
}
