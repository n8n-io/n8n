import {
	HostCallError,
	MemoryLimitError,
	RuntimeRestartingError,
	SecurityViolationError,
	SyntaxError,
	TimeoutError,
} from '../types';

export type ExpressionErrorType =
	| 'timeout'
	| 'memory_limit'
	| 'security'
	| 'syntax'
	| 'host_error'
	| 'engine_restarting'
	| 'unknown';

export function classifyExpressionError(error: unknown): ExpressionErrorType {
	if (error instanceof TimeoutError) return 'timeout';
	if (error instanceof MemoryLimitError) return 'memory_limit';
	if (error instanceof SecurityViolationError) return 'security';
	if (error instanceof SyntaxError) return 'syntax';
	if (error instanceof HostCallError) return 'host_error';
	if (error instanceof RuntimeRestartingError) return 'engine_restarting';
	return 'unknown';
}

/**
 * Where a bridge error started. `errorName` is the name of the first error,
 * which the bridge can replace with a generic `Error` before it throws.
 */
export interface ExpressionErrorOrigin {
	kind:
		| 'compile'
		| 'guest'
		| 'host_callback'
		| 'guest_uncaught'
		| 'rebuild'
		| 'callback_setup'
		| 'callback_cleanup'
		| 'bridge';
	errorName?: string;
}

const errorOrigins = new WeakMap<object, ExpressionErrorOrigin>();

/** Record where `error` started, and return `error`. A primitive error keeps no origin. */
export function tagErrorOrigin<T>(error: T, origin: ExpressionErrorOrigin): T {
	if (typeof error === 'object' && error !== null) {
		errorOrigins.set(error, origin);
	}
	return error;
}

/** The origin that `tagErrorOrigin` recorded for `error`, or `undefined`. */
export function errorOriginOf(error: unknown): ExpressionErrorOrigin | undefined {
	return typeof error === 'object' && error !== null ? errorOrigins.get(error) : undefined;
}
