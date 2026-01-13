import { mapTo, IContext } from 'intento-core';
import type { INodeProperties } from 'n8n-workflow';

const DELAY = {
	KEYS: {
		DELAY_MODE: 'delay_context_delay_mode',
		DELAY_VALUE: 'delay_context_delay_value',
	},
	MODES: {
		NO_DELAY: 'noDelay',
		RANDOM_DELAY: 'randomDelay',
		FIXED_DELAY: 'fixedDelay',
	},
	DEFAULTS: {
		DELAY_MODE: 'noDelay',
		DELAY_VALUE: 1000,
	},
	BOUNDARIES: {
		DELAY_VALUE: { min: 100, max: 60000 },
	},
} as const;

export type DelayMode = 'noDelay' | 'randomDelay' | 'fixedDelay';

/**
 * Context for configuring delays between translation requests.
 *
 * Supports no delay, fixed delay, or random delay patterns for rate limiting
 * and throttling translation provider requests. Must call throwIfInvalid() after
 * construction to ensure delayValue is provided when required by mode.
 */
export class DelayContext implements IContext {
	readonly delayMode: DelayMode;
	/** Delay duration in milliseconds. Required for randomDelay and fixedDelay modes. */
	readonly delayValue?: number;

	/**
	 * @param delayMode - Type of delay: noDelay (immediate), randomDelay (0 to delayValue), fixedDelay (constant)
	 * @param delayValue - Delay duration in ms. Must be 100-60000ms for randomDelay/fixedDelay modes
	 */
	constructor(@mapTo(DELAY.KEYS.DELAY_MODE) delayMode: DelayMode, @mapTo(DELAY.KEYS.DELAY_VALUE) delayValue?: number) {
		this.delayMode = delayMode;
		this.delayValue = delayValue;

		Object.freeze(this);
	}

	/**
	 * Validates delayValue is provided and within bounds for randomDelay/fixedDelay modes.
	 *
	 * @throws Error if delayValue missing when required by mode
	 * @throws RangeError if delayValue outside 100-60000ms range
	 */
	throwIfInvalid(): void {
		switch (this.delayMode) {
			case DELAY.MODES.NO_DELAY:
				return;
			case DELAY.MODES.RANDOM_DELAY:
			case DELAY.MODES.FIXED_DELAY:
				if (!this.delayValue) throw new Error(`"delayValue" is required for the delayMode ${this.delayMode}`);
				if (this.delayValue < DELAY.BOUNDARIES.DELAY_VALUE.min)
					throw new RangeError(`"delayValue" must be at least ${DELAY.BOUNDARIES.DELAY_VALUE.min}`);
				if (this.delayValue > DELAY.BOUNDARIES.DELAY_VALUE.max)
					throw new RangeError(`"delayValue" must be at most ${DELAY.BOUNDARIES.DELAY_VALUE.max}`);
				break;
			default:
				throw new Error(`"delayMode" must be one of: ${Object.values(DELAY.MODES).join(', ')}`);
		}
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			delayMode: this.delayMode,
			delayValue: this.delayValue,
		};
	}

	/**
	 * Calculates delay duration in milliseconds based on mode.
	 *
	 * For randomDelay, returns uniform random value [0, delayValue).
	 * Assumes throwIfInvalid() called - delayValue is guaranteed non-null for non-zero modes.
	 *
	 * @returns Delay in milliseconds (0 for noDelay, random for randomDelay, fixed for fixedDelay)
	 */
	calculateDelay(): number {
		switch (this.delayMode) {
			case DELAY.MODES.NO_DELAY:
				return 0;
			case DELAY.MODES.RANDOM_DELAY:
				// NOTE: Math.random() returns [0, 1), so result is [0, delayValue) in ms
				return Math.floor(Math.random() * this.delayValue!);
			case DELAY.MODES.FIXED_DELAY:
				return this.delayValue!;
			default:
				// NOTE: Should never reach here if throwIfInvalid() called - default returns 0 for safety
				return 0;
		}
	}
}

export const CONTEXT_DELAY = [
	{
		displayName: 'Delay Mode',
		name: DELAY.KEYS.DELAY_MODE,
		type: 'options',
		default: DELAY.DEFAULTS.DELAY_MODE,
		description: 'Type of delay to apply before each request',
		options: [
			{
				name: 'No Delay',
				value: DELAY.MODES.NO_DELAY,
				description: 'Execute requests immediately without delay',
			},
			{
				name: 'Random Delay',
				value: DELAY.MODES.RANDOM_DELAY,
				description: `Apply a random delay between ${DELAY.BOUNDARIES.DELAY_VALUE.min} and the specified value`,
			},
			{
				name: 'Fixed Delay',
				value: DELAY.MODES.FIXED_DELAY,
				description: 'Apply a fixed delay of the specified duration',
			},
		],
	},
	{
		displayName: 'Delay (ms)',
		name: DELAY.KEYS.DELAY_VALUE,
		type: 'number',
		default: DELAY.DEFAULTS.DELAY_VALUE,
		description: 'Delay duration in milliseconds',
		typeOptions: {
			minValue: DELAY.BOUNDARIES.DELAY_VALUE.min,
			maxValue: DELAY.BOUNDARIES.DELAY_VALUE.max,
		},
		displayOptions: {
			show: {
				[DELAY.KEYS.DELAY_MODE]: [DELAY.MODES.RANDOM_DELAY, DELAY.MODES.FIXED_DELAY],
			},
		},
	},
] as INodeProperties[];
