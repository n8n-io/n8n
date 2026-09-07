import type { EngineLogger } from './logger.types';

/**
 * An `EngineLogger` writing to the console, for standalone mode and as the
 * fallback wherever a host supplied none.
 *
 * The scope is prefixed here because an integrated host gets it from its own
 * logger instead, so the messages themselves carry none.
 */
export function createConsoleLogger(scope = 'engine'): EngineLogger {
	const write = (
		to: (message: string, ...rest: unknown[]) => void,
		message: string,
		metadata?: Record<string, unknown>,
	): void => {
		if (metadata === undefined) to(`${scope}: ${message}`);
		else to(`${scope}: ${message}`, metadata);
	};

	return {
		error: (message, metadata) => write(console.error, message, metadata),
		warn: (message, metadata) => write(console.warn, message, metadata),
		info: (message, metadata) => write(console.info, message, metadata),
		debug: (message, metadata) => write(console.debug, message, metadata),
	};
}
