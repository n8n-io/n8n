import { MemoryLimitError, SecurityViolationError, SyntaxError, TimeoutError } from '../types';

export type ExpressionErrorType = 'timeout' | 'memory_limit' | 'security' | 'syntax' | 'unknown';

export function classifyExpressionError(error: unknown): ExpressionErrorType {
	if (error instanceof TimeoutError) return 'timeout';
	if (error instanceof MemoryLimitError) return 'memory_limit';
	if (error instanceof SecurityViolationError) return 'security';
	if (error instanceof SyntaxError) return 'syntax';
	return 'unknown';
}
