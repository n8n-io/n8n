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

export class DelayContext implements IContext {
	readonly delayMode: DelayMode;
	readonly delayValue?: number;

	constructor(@mapTo(DELAY.KEYS.DELAY_MODE) delayMode: DelayMode, @mapTo(DELAY.KEYS.DELAY_VALUE) delayValue?: number) {
		this.delayMode = delayMode;
		this.delayValue = delayValue;

		Object.freeze(this);
	}

	throwIfInvalid(): void {
		switch (this.delayMode) {
			case DELAY.MODES.NO_DELAY:
				return;
			case DELAY.MODES.RANDOM_DELAY:
			case DELAY.MODES.FIXED_DELAY:
				if (!this.delayValue) throw new Error(`delayValue is required for the delayMode ${this.delayMode}`);
				if (this.delayValue < DELAY.BOUNDARIES.DELAY_VALUE.min)
					throw new Error(`delayValue must be at least ${DELAY.BOUNDARIES.DELAY_VALUE.min}`);
				if (this.delayValue > DELAY.BOUNDARIES.DELAY_VALUE.max)
					throw new Error(`delayValue must be at most ${DELAY.BOUNDARIES.DELAY_VALUE.max}`);
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
	 * Calculate the delay in milliseconds based on the mode
	 * @returns Delay in milliseconds
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
