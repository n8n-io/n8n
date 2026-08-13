/**
 * Runtime error thrown inside isolated context.
 *
 * These errors are thrown by the runtime code when something goes wrong during
 * expression evaluation. The bridge must catch these and translate them to the
 * appropriate ExpressionError subclass (see evaluator.ts).
 *
 * Translation mapping:
 * - code: 'MEMORY_LIMIT' → MemoryLimitError
 * - code: 'TIMEOUT' → TimeoutError
 * - code: 'SECURITY_VIOLATION' → SecurityViolationError
 * - code: 'SYNTAX_ERROR' → SyntaxError
 * - other → ExpressionError
 */
export class RuntimeError extends Error {
	constructor(
		message: string,
		public code: string,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = 'RuntimeError';
	}
}
