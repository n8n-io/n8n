/**
 * Interface for context objects that encapsulate n8n node configuration.
 *
 * Contexts are domain-specific configuration holders created from n8n node parameters
 * via ContextFactory's decorator-based extraction system. They provide validated,
 * type-safe access to configuration throughout execution workflows.
 *
 * **Lifecycle:**
 * 1. ContextFactory.read() extracts n8n params → constructor args (via @mapTo decorators)
 * 2. Constructor assigns fields + freezes instance (immutability)
 * 3. throwIfInvalid() validates all constraints
 * 4. Context flows through execution (Supplier, Tracer, etc.)
 *
 * **Primary Use Cases:**
 * - ExecutionContext: Retry/timeout configuration for SupplierBase
 * - Custom contexts: Domain-specific config (language pairs, API settings, etc.)
 *
 * **Design Principles:**
 * - Immutability: Frozen after construction to prevent mid-execution changes
 * - Fail-fast: Validation throws immediately on misconfiguration
 * - Traceability: asLogMetadata() exposes all config for debugging
 *
 * @example
 * ```typescript
 * // ExecutionContext implementation
 * class ExecutionContext implements IContext {
 *   constructor(
 *     @mapTo('maxAttempts', 'options') maxAttempts: number = 5,
 *     @mapTo('timeoutMs', 'options') timeoutMs: number = 10000
 *   ) {
 *     this.maxAttempts = maxAttempts;
 *     this.timeoutMs = timeoutMs;
 *     Object.freeze(this);
 *   }
 *
 *   throwIfInvalid(): void {
 *     if (this.maxAttempts < 1 || this.maxAttempts > 50) {
 *       throw new RangeError(`maxAttempts must be 1-50, got ${this.maxAttempts}`);
 *     }
 *     if (this.timeoutMs < 1000 || this.timeoutMs > 600000) {
 *       throw new RangeError(`timeoutMs must be 1000-600000ms, got ${this.timeoutMs}`);
 *     }
 *   }
 *
 *   asLogMetadata(): Record<string, unknown> {
 *     return { maxAttempts: this.maxAttempts, timeoutMs: this.timeoutMs };
 *   }
 * }
 *
 * // Usage via ContextFactory
 * const context = ContextFactory.read(ExecutionContext, functions, tracer);
 * // → Extracts options.maxAttempts and options.timeoutMs from n8n node
 * // → Validates boundaries via throwIfInvalid()
 * // → Returns frozen, validated instance
 * ```
 *
 * @see {@link ContextFactory} for creation mechanism
 * @see {@link ExecutionContext} for canonical implementation
 * @see {@link mapTo} decorator for parameter extraction configuration
 */
export interface IContext {
	/**
	 * Validates context state against all constraints and business rules.
	 *
	 * **Called by ContextFactory.read()** immediately after construction but before
	 * returning the instance to ensure no invalid contexts escape into execution.
	 *
	 * **Validation Strategy:**
	 * - Check required fields are present (not null/undefined)
	 * - Validate boundaries (min/max ranges)
	 * - Verify business logic constraints (e.g., timeout > delay)
	 * - Validate relationships between fields
	 *
	 * **Error Handling:**
	 * Throw descriptive errors (Error, RangeError, TypeError) that identify:
	 * - Which field failed validation
	 * - What the constraint was
	 * - What the actual value was
	 *
	 * ContextFactory catches these errors, enriches them with full context metadata
	 * via asLogMetadata(), and logs before re-throwing as CoreError.
	 *
	 * @throws Error if required fields are missing
	 * @throws RangeError if numeric fields are out of bounds
	 * @throws TypeError if fields have wrong type/format
	 *
	 * @example
	 * ```typescript
	 * throwIfInvalid(): void {
	 *   // Required field check
	 *   if (!this.apiKey) throw new Error('apiKey is required');
	 *
	 *   // Boundary validation
	 *   if (this.maxRetries < 1 || this.maxRetries > 10) {
	 *     throw new RangeError(`maxRetries must be 1-10, got ${this.maxRetries}`);
	 *   }
	 *
	 *   // Business logic constraint
	 *   if (this.timeoutMs < this.retryDelayMs) {
	 *     throw new Error('timeout must exceed retry delay');
	 *   }
	 * }
	 * ```
	 */
	throwIfInvalid(): void;

	/**
	 * Converts context state into structured logging metadata.
	 *
	 * **Used by ContextFactory** to enrich validation errors with complete context
	 * state when throwIfInvalid() fails. Also used by Tracer for debug logging
	 * when contexts flow through execution.
	 *
	 * **Return Structure:**
	 * - Flat key-value pairs preferred (logging system compatibility)
	 * - Include all configuration values (helps diagnose issues)
	 * - Omit sensitive data (credentials, tokens, PII)
	 * - Use descriptive keys matching field names
	 *
	 * @returns Flat object with all context configuration for logging
	 *
	 * @example
	 * ```typescript
	 * asLogMetadata(): Record<string, unknown> {
	 *   return {
	 *     maxAttempts: this.maxAttempts,
	 *     maxDelayMs: this.maxDelayMs,
	 *     maxJitter: this.maxJitter,
	 *     timeoutMs: this.timeoutMs
	 *   };
	 * }
	 *
	 * // Used by ContextFactory when validation fails:
	 * // → Calls asLogMetadata() to get full state
	 * // → Logs enriched error: { context: { name: 'ExecutionContext', ...metadata }, childError }
	 * // → Helps debug which config values caused validation failure
	 * ```
	 */
	asLogMetadata(): Record<string, unknown>;
}
