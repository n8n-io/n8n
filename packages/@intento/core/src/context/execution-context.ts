import type { INodeProperties } from 'n8n-workflow';

import { mapTo } from 'context/context-factory';
import { IContext } from 'types/*';

/**
 * Configuration constants for execution context validation and defaults.
 *
 * KEYS: n8n node parameter paths (must match CONTEXT_EXECUTION property names)
 * DEFAULTS: Safe values for typical API calls with moderate retry tolerance
 * BOUNDARIES: Hard limits to prevent infinite loops and excessive resource consumption
 *
 * Ranges designed for:
 * - MAX_ATTEMPTS: 1-50 prevents infinite retry loops while allowing persistence
 * - MAX_DELAY_MS: 100-60000 balances responsiveness (0.1s) with patience (60s)
 * - MAX_JITTER: 0.1-0.9 provides meaningful variance without excessive randomization
 * - TIMEOUT_MS: 1000-600000 spans quick responses (1s) to long operations (10min)
 */
const EXECUTION = {
	KEYS: {
		COLLECTION: 'execution_context',
		MAX_ATTEMPTS: 'max_attempts',
		MAX_DELAY_MS: 'max_delay_ms',
		MAX_JITTER: 'max_jitter',
		TIMEOUT_MS: 'timeout_ms',
	},
	DEFAULTS: {
		MAX_ATTEMPTS: 5,
		MAX_DELAY_MS: 5000,
		MAX_JITTER: 0.2,
		TIMEOUT_MS: 10000,
	},
	BOUNDARIES: {
		MAX_ATTEMPTS: { min: 1, max: 50 },
		MAX_DELAY_MS: { min: 100, max: 60000 },
		MAX_JITTER: { min: 0.1, max: 0.9 },
		TIMEOUT_MS: { min: 1000, max: 600000 },
	},
} as const;

/**
 * n8n node properties defining execution configuration UI and validation.
 *
 * Collection structure provides grouped options in n8n UI under "Execution Options".
 * Each option includes inline validation (typeOptions) matching EXECUTION.BOUNDARIES.
 *
 * Used by n8n to:
 * - Render configuration UI with proper input controls
 * - Apply client-side validation before node execution
 * - Provide descriptive help text to users
 */
export const CONTEXT_EXECUTION = [
	{
		displayName: 'Execution Options',
		name: EXECUTION.KEYS.COLLECTION,
		type: 'collection',
		placeholder: 'Add Execution Option',
		default: {},
		options: [
			{
				displayName: 'Max Attempts',
				name: EXECUTION.KEYS.MAX_ATTEMPTS,
				type: 'number',
				default: EXECUTION.DEFAULTS.MAX_ATTEMPTS,
				description: 'Maximum number of retry attempts',
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
			},
			{
				displayName: 'Max Delay (ms)',
				name: EXECUTION.KEYS.MAX_DELAY_MS,
				type: 'number',
				default: EXECUTION.DEFAULTS.MAX_DELAY_MS,
				description: 'Maximum delay between retries in milliseconds',
				typeOptions: {
					minValue: 100,
					maxValue: 60000,
				},
			},
			{
				displayName: 'Max Jitter',
				name: EXECUTION.KEYS.MAX_JITTER,
				type: 'number',
				default: EXECUTION.DEFAULTS.MAX_JITTER,
				description: 'Maximum jitter factor (0-1)',
				typeOptions: {
					minValue: 0.1,
					maxValue: 0.9,
				},
			},
			{
				displayName: 'Timeout (ms)',
				name: EXECUTION.KEYS.TIMEOUT_MS,
				type: 'number',
				default: EXECUTION.DEFAULTS.TIMEOUT_MS,
				description: 'Execution timeout in milliseconds',
				typeOptions: {
					minValue: 1000,
					maxValue: 600000,
				},
			},
		],
	},
] as INodeProperties[];

/**
 * Context for execution configuration including retry and timeout settings.
 *
 * Provides exponential backoff calculation with jitter and abort signal creation
 * for resilient API calls and long-running operations. All instances are immutable
 * (frozen) after construction.
 *
 * **Valid ranges** (enforced by throwIfInvalid):
 * - maxAttempts: 1-50 retry attempts
 * - maxDelayMs: 100-60000ms between retries
 * - maxJitter: 0.1-0.9 randomization factor
 * - timeoutMs: 1000-600000ms operation timeout
 *
 * **Usage pattern:**
 * ```typescript
 * const context = ContextFactory.read(ExecutionContext, functions, tracer);
 * for (let attempt = 0; attempt < context.maxAttempts; attempt++) {
 *   const delay = context.calculateDelay(attempt);
 *   const signal = context.createAbortSignal(parentSignal);
 *   await sleep(delay);
 *   try {
 *     return await apiCall({ signal });
 *   } catch (error) {
 *     if (attempt === context.maxAttempts - 1) throw error;
 *   }
 * }
 * ```
 */
export class ExecutionContext implements IContext {
	readonly maxAttempts: number;
	readonly maxDelayMs: number;
	readonly maxJitter: number;
	readonly timeoutMs: number;

	/**
	 * Creates immutable execution context with retry and timeout configuration.
	 *
	 * All parameters are decorated with @mapTo to enable automatic extraction from
	 * n8n node parameters via ContextFactory. Default values match EXECUTION.DEFAULTS
	 * to provide safe fallbacks when options are not specified.
	 *
	 * Instance is frozen after construction to prevent modification during execution
	 * (ensures retry logic consistency across attempts).
	 *
	 * @param maxAttempts - Maximum retry attempts (1-50), defaults to 5
	 * @param maxDelayMs - Maximum delay between retries in ms (100-60000), defaults to 5000
	 * @param maxJitter - Jitter factor for retry variance (0.1-0.9), defaults to 0.2
	 * @param timeoutMs - Operation timeout in ms (1000-600000), defaults to 10000
	 */
	constructor(
		@mapTo(EXECUTION.KEYS.MAX_ATTEMPTS, EXECUTION.KEYS.COLLECTION) maxAttempts: number = EXECUTION.DEFAULTS.MAX_ATTEMPTS,
		@mapTo(EXECUTION.KEYS.MAX_DELAY_MS, EXECUTION.KEYS.COLLECTION) maxDelayMs: number = EXECUTION.DEFAULTS.MAX_DELAY_MS,
		@mapTo(EXECUTION.KEYS.MAX_JITTER, EXECUTION.KEYS.COLLECTION) maxJitter: number = EXECUTION.DEFAULTS.MAX_JITTER,
		@mapTo(EXECUTION.KEYS.TIMEOUT_MS, EXECUTION.KEYS.COLLECTION) timeoutMs: number = EXECUTION.DEFAULTS.TIMEOUT_MS,
	) {
		this.maxAttempts = maxAttempts;
		this.maxDelayMs = maxDelayMs;
		this.maxJitter = maxJitter;
		this.timeoutMs = timeoutMs;

		// NOTE: Freeze to prevent modification during execution (ensures retry consistency)
		Object.freeze(this);
	}

	/**
	 * Validates all configuration parameters are within acceptable boundaries.
	 *
	 * Called by ContextFactory.read() after construction. Throws descriptive errors
	 * for missing values or out-of-range parameters to fail fast on misconfiguration.
	 *
	 * @throws Error if any required parameter is null/undefined
	 * @throws RangeError if any parameter is outside EXECUTION.BOUNDARIES
	 */
	throwIfInvalid(): void {
		this.validateRequired();
		this.validateBoundaries();
	}

	/**
	 * Validates all required parameters are present (not null/undefined).
	 *
	 * Separate from boundary checks to provide clear error messages distinguishing
	 * missing values from invalid values.
	 *
	 * @throws Error with parameter name if any value is null/undefined
	 */
	private validateRequired(): void {
		if (this.maxAttempts === null || this.maxAttempts === undefined) throw new Error('maxAttempts is required for ExecutionContext');
		if (this.maxDelayMs === null || this.maxDelayMs === undefined) throw new Error('maxDelayMs is required for ExecutionContext');
		if (this.maxJitter === null || this.maxJitter === undefined) throw new Error('maxJitter is required for ExecutionContext');
		if (this.timeoutMs === null || this.timeoutMs === undefined) throw new Error('timeoutMs is required for ExecutionContext');
	}

	/**
	 * Validates all parameters are within acceptable boundaries.
	 *
	 * Boundaries prevent:
	 * - Infinite retry loops (maxAttempts capped at 50)
	 * - Excessive delays (maxDelayMs capped at 60s)
	 * - Insufficient randomization (maxJitter minimum 0.1)
	 * - Premature timeouts (timeoutMs minimum 1s)
	 *
	 * @throws RangeError with parameter name, boundary, and actual value if out of range
	 */
	private validateBoundaries(): void {
		if (this.maxAttempts < EXECUTION.BOUNDARIES.MAX_ATTEMPTS.min)
			throw new RangeError(`maxAttempts must be at least ${EXECUTION.BOUNDARIES.MAX_ATTEMPTS.min}, but got ${this.maxAttempts}`);

		if (this.maxAttempts > EXECUTION.BOUNDARIES.MAX_ATTEMPTS.max)
			throw new RangeError(`maxAttempts must be at most ${EXECUTION.BOUNDARIES.MAX_ATTEMPTS.max}, but got ${this.maxAttempts}`);

		if (this.maxDelayMs < EXECUTION.BOUNDARIES.MAX_DELAY_MS.min)
			throw new RangeError(`maxDelayMs must be at least ${EXECUTION.BOUNDARIES.MAX_DELAY_MS.min}, but got ${this.maxDelayMs}`);

		if (this.maxDelayMs > EXECUTION.BOUNDARIES.MAX_DELAY_MS.max)
			throw new RangeError(`maxDelayMs must be at most ${EXECUTION.BOUNDARIES.MAX_DELAY_MS.max}, but got ${this.maxDelayMs}`);

		if (this.maxJitter < EXECUTION.BOUNDARIES.MAX_JITTER.min)
			throw new RangeError(`maxJitter must be at least ${EXECUTION.BOUNDARIES.MAX_JITTER.min}, but got ${this.maxJitter}`);

		if (this.maxJitter > EXECUTION.BOUNDARIES.MAX_JITTER.max)
			throw new RangeError(`maxJitter must be at most ${EXECUTION.BOUNDARIES.MAX_JITTER.max}, but got ${this.maxJitter}`);

		if (this.timeoutMs < EXECUTION.BOUNDARIES.TIMEOUT_MS.min)
			throw new RangeError(`timeoutMs must be at least ${EXECUTION.BOUNDARIES.TIMEOUT_MS.min}, but got ${this.timeoutMs}`);

		if (this.timeoutMs > EXECUTION.BOUNDARIES.TIMEOUT_MS.max)
			throw new RangeError(`timeoutMs must be at most ${EXECUTION.BOUNDARIES.TIMEOUT_MS.max}, but got ${this.timeoutMs}`);
	}

	/**
	 * Returns execution configuration as structured log metadata.
	 *
	 * Used by Tracer for debug logging and error enrichment. All numeric values
	 * included to help diagnose retry/timeout issues in logs.
	 *
	 * @returns Object with all configuration parameters for logging
	 */
	asLogMetadata(): Record<string, unknown> {
		return {
			maxAttempts: this.maxAttempts,
			maxDelayMs: this.maxDelayMs,
			maxJitter: this.maxJitter,
			timeoutMs: this.timeoutMs,
		};
	}

	/**
	 * Calculates retry delay using exponential backoff with jitter.
	 *
	 * **Algorithm:**
	 * 1. First attempt (0) returns 0 delay (immediate execution)
	 * 2. Base delay scaled so exponential growth reaches maxDelayMs at final retry
	 * 3. Jitter adds uniform random variance to prevent thundering herd
	 * 4. Result capped at maxDelayMs to handle jitter overflow
	 *
	 * **Example** (maxAttempts=5, maxDelayMs=5000, maxJitter=0.2):
	 * - Attempt 0: 0ms (immediate)
	 * - Attempt 1: ~625ms ± 125ms jitter (500-750ms range)
	 * - Attempt 2: ~1250ms ± 250ms jitter (1000-1500ms range)
	 * - Attempt 3: ~2500ms ± 500ms jitter (2000-3000ms range)
	 * - Attempt 4: ~5000ms ± 1000ms jitter (4000-6000ms range, capped at 5000ms)
	 *
	 * @param attempt - Zero-based retry attempt number (0 = first attempt, no delay)
	 * @returns Calculated delay in milliseconds, capped at maxDelayMs
	 * @throws RangeError if attempt is negative or >= maxAttempts
	 */
	calculateDelay(attempt: number): number {
		if (attempt === 0) return 0;
		if (attempt < 0) throw new RangeError(`Execution attempt must be non-negative, but got ${attempt}`);
		if (attempt >= this.maxAttempts) throw new RangeError(`Execution attempt must be less than ${this.maxAttempts}, but got ${attempt}`);

		// NOTE: Base delay scaled so exponential growth reaches maxDelayMs at final retry
		const baseDelay = this.maxDelayMs / 2 ** (this.maxAttempts - 1);
		// NOTE: Jitter prevents thundering herd via uniform random variance scaled by maxJitter factor and baseDelay
		const jitter = this.maxJitter * (Math.random() - 0.5) * 2 * baseDelay;
		// NOTE: Cap at maxDelayMs since jitter can push delay above maximum (e.g., attempt 4 with positive jitter)
		return Math.min(this.maxDelayMs, baseDelay * 2 ** attempt + jitter);
	}

	/**
	 * Creates abort signal with timeout, optionally chained to parent signal.
	 *
	 * **Abort conditions:**
	 * - Timeout: Always aborts after timeoutMs milliseconds
	 * - Parent: If provided, aborts when parent signal aborts (cancellation chain)
	 * - Result: Aborts when EITHER condition occurs (race between timeout and parent)
	 *
	 * **Use cases:**
	 * - Without parent: Simple operation timeout
	 * - With parent: Workflow cancellation + operation timeout (whichever comes first)
	 *
	 * @param parent - Optional parent signal for cancellation chain (e.g., workflow abort)
	 * @returns Combined signal that aborts on timeout OR parent abort
	 * @throws AbortError if parent signal already aborted (fail-fast on cancellation)
	 */
	createAbortSignal(parent?: AbortSignal): AbortSignal {
		// NOTE: Fail fast if parent already aborted (avoid unnecessary work)
		parent?.throwIfAborted();

		const timeout = AbortSignal.timeout(this.timeoutMs);
		if (!parent) return timeout;

		// NOTE: AbortSignal.any() aborts when first signal aborts (race condition)
		return AbortSignal.any([parent, timeout]);
	}
}
