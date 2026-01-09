import type { INodeProperties } from 'n8n-workflow';

import { mapTo } from 'context/context-factory';
import { IContext } from 'types/*';

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

export class ExecutionContext implements IContext {
	readonly maxAttempts: number;
	readonly maxDelayMs: number;
	readonly maxJitter: number;
	readonly timeoutMs: number;

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

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		this.validateRequired();
		this.validateBoundaries();
	}

	private validateRequired(): void {
		if (this.maxAttempts === null || this.maxAttempts === undefined) throw new Error('maxAttempts is required for ExecutionContext');
		if (this.maxDelayMs === null || this.maxDelayMs === undefined) throw new Error('maxDelayMs is required for ExecutionContext');
		if (this.maxJitter === null || this.maxJitter === undefined) throw new Error('maxJitter is required for ExecutionContext');
		if (this.timeoutMs === null || this.timeoutMs === undefined) throw new Error('timeoutMs is required for ExecutionContext');
	}

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

	asLogMetadata(): Record<string, unknown> {
		return {
			maxAttempts: this.maxAttempts,
			maxDelayMs: this.maxDelayMs,
			maxJitter: this.maxJitter,
			timeoutMs: this.timeoutMs,
		};
	}

	calculateDelay(attempt: number): number {
		if (attempt === 0) return 0;
		if (attempt < 0) throw new RangeError(`Execution attempt must be non-negative, but got ${attempt}`);
		if (attempt >= this.maxAttempts) throw new RangeError(`Execution attempt must be less than ${this.maxAttempts}, but got ${attempt}`);

		const baseDelay = this.maxDelayMs / 2 ** (this.maxAttempts - 1);
		const jitter = this.maxJitter * (Math.random() - 0.5) * 2 * baseDelay;
		return Math.min(this.maxDelayMs, baseDelay * 2 ** attempt + jitter);
	}

	createAbortSignal(parent?: AbortSignal): AbortSignal {
		const timeout = AbortSignal.timeout(this.timeoutMs);
		if (!parent) return timeout;

		return AbortSignal.any([parent, timeout]);
	}
}
