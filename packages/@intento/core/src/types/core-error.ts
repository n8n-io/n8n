import type { LogMetadata } from 'n8n-workflow';

/**
 * Core library error with structured metadata for rich error context.
 *
 * Extends standard Error with optional metadata field that carries structured
 * logging context through error propagation chains. Enables error tracking systems
 * and logs to capture actionable diagnostic information beyond the error message.
 *
 * **Primary Use Cases:**
 * - Tracer error propagation: `errorAndThrow()` creates CoreError with traceId, nodeId, etc.
 * - Developer errors: ContextFactory validation failures (decorator misuse, config errors)
 * - Distinguishing known errors from bugs: SupplierBase checks `instanceof CoreError`
 *
 * **Design Philosophy:**
 * CoreError represents **expected** error conditions that intento-core anticipates
 * and can handle meaningfully. Generic Error instances indicate unexpected bugs that
 * should be wrapped with developer-facing messages.
 *
 * **Error Handling Pattern:**
 * ```typescript
 * catch (error) {
 *   if (error instanceof CoreError) {
 *     // Known error - use message as-is
 *     return error.message;
 *   } else {
 *     // Unexpected bug - wrap with context
 *     return `🐞 [BUG] Unexpected error: ${error.message}`;
 *   }
 * }
 * ```
 *
 * **Metadata Guidelines:**
 * - Include correlation IDs (traceId, requestId, executionId)
 * - Include diagnostic values (attempt number, timeout, node name)
 * - Omit sensitive data (credentials, tokens, PII)
 * - Use flat structure for logging system compatibility
 *
 * @example
 * ```typescript
 * // From Tracer - automatic context enrichment
 * tracer.errorAndThrow('Supply failed', { attempt: 3, latencyMs: 5000 });
 * // Throws CoreError with: { message: '...', metadata: { traceId, nodeName, attempt, latencyMs } }
 *
 * // From ContextFactory - developer error
 * throw new CoreError(
 *   '🐞 [BUG] at ExecutionContext. No mapping metadata. Apply @mapTo decorator...'
 * );
 *
 * // In SupplierBase - error discrimination
 * const message = error instanceof CoreError
 *   ? error.message  // Known error, use as-is
 *   : `🐞 [BUG] Unexpected error: ${error.message}`;  // Bug, wrap with prefix
 * ```
 *
 * @see {@link Tracer.errorAndThrow} for primary error creation pattern
 * @see {@link SupplierBase.failAndThrow} for error discrimination pattern
 */
export class CoreError extends Error {
	/**
	 * Structured metadata providing error context for logging and diagnostics.
	 *
	 * Populated by Tracer with workflow context (traceId, nodeName, executionId)
	 * plus any additional diagnostic data passed to errorAndThrow().
	 *
	 * Used by error tracking systems to correlate errors across distributed traces
	 * and provide rich context for debugging.
	 */
	readonly metadata?: LogMetadata;

	/**
	 * Creates a CoreError with optional structured metadata.
	 *
	 * @param message - Human-readable error description (use emoji prefixes: 🐞 for bugs, ⚙️ for config issues)
	 * @param metadata - Structured context data for logging (traceId, nodeId, diagnostic values)
	 *
	 * @example
	 * ```typescript
	 * throw new CoreError('⚙️ Invalid timeout configuration', {
	 *   timeoutMs: -1,
	 *   nodeName: 'TranslationAgent',
	 *   executionId: 'abc-123'
	 * });
	 * ```
	 */
	constructor(message: string, metadata?: LogMetadata) {
		super(message);
		this.name = 'Intento Core Error';
		this.metadata = metadata;
	}
}
