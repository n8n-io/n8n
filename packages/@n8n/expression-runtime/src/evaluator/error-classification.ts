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
