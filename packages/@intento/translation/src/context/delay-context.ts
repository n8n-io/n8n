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
 * Delay configuration context for rate limiting and pacing requests.
 *
 * Supports three modes: no delay, fixed delay, or random delay (for jitter).
 * Used to prevent overwhelming APIs or simulate human-like request patterns.
 */
export class DelayContext implements IContext {
	/** Delay strategy: 'noDelay', 'randomDelay', or 'fixedDelay' */
	readonly delayMode: DelayMode;
	/** Delay duration in milliseconds - required for randomDelay and fixedDelay modes */
	readonly delayValue?: number;

	/**
	 * Creates delay context from n8n node parameters.
	 *
	 * NOTE: @mapTo decorators execute bottom-to-top, binding parameters to n8n properties.
	 *
	 * @param delayMode - Delay strategy to apply
	 * @param delayValue - Delay duration in ms, must be 100-60000 when required
	 */
	constructor(@mapTo(DELAY.KEYS.DELAY_MODE) delayMode: DelayMode, @mapTo(DELAY.KEYS.DELAY_VALUE) delayValue?: number) {
		this.delayMode = delayMode;
		this.delayValue = delayValue;

		Object.freeze(this);
	}

	/**
	 * Validates delay configuration based on selected mode.
	 *
	 * NOTE: Delay value must be 100-60000ms when required to prevent premature/infinite waits.
	 *
	 * @throws Error if delayValue missing for randomDelay/fixedDelay modes
	 * @throws Error if delayValue outside 100-60000ms range
	 * @throws Error if delayMode is not a recognized value
	 */
	throwIfInvalid(): void {
		switch (this.delayMode) {
			case DELAY.MODES.NO_DELAY:
				return;
			case DELAY.MODES.RANDOM_DELAY:
			case DELAY.MODES.FIXED_DELAY:
				if (!this.delayValue) throw new Error(`delayValue is required for the delayMode ${this.delayMode}`);
				if (this.delayValue < DELAY.BOUNDARIES.DELAY_VALUE.min)
					throw new RangeError(`delayValue must be at least ${DELAY.BOUNDARIES.DELAY_VALUE.min}`);
				if (this.delayValue > DELAY.BOUNDARIES.DELAY_VALUE.max)
					throw new RangeError(`delayValue must be at most ${DELAY.BOUNDARIES.DELAY_VALUE.max}`);
				break;
			default:
				throw new Error(`delayMode must be one of: ${Object.values(DELAY.MODES).join(', ')}`);
		}
	}

	asLogMetadata(): Record<string, unknown> {
		return {
			delayMode: this.delayMode,
			delayValue: this.delayValue,
		};
	}

	/**
	 * Calculates delay in milliseconds based on configured mode.
	 *
	 * @returns 0 for noDelay, delayValue for fixedDelay, random value [0, delayValue) for randomDelay
	 */
	calculateDelay(): number {
		switch (this.delayMode) {
			case DELAY.MODES.NO_DELAY:
				return 0;
			case DELAY.MODES.RANDOM_DELAY:
				return Math.floor(Math.random() * this.delayValue!);
			case DELAY.MODES.FIXED_DELAY:
				return this.delayValue!;
			default:
				return 0;
		}
	}
}

/**
 * n8n node properties for delay context.
 *
 * Defines UI form fields for delay configuration in n8n workflow editor.
 * Property names must match DELAY.KEYS for @mapTo decorator binding.
 */
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
