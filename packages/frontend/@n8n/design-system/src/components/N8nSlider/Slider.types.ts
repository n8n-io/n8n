import type { InputSize } from '../../types/input';

export type SliderValue = [number];

export interface SliderProps {
	/** The control size. Matches N8nInput. Default large. */
	size?: InputSize;
	/** The value in controlled mode. */
	modelValue?: SliderValue;
	/** The initial value in uncontrolled mode. */
	defaultValue?: SliderValue;
	/** The maximum allowed value. Default 100. */
	maxValue?: number;
	/** The minimum allowed value. Default 0. */
	minValue?: number;
	/** The step interval. Default 1. */
	step?: number;
	/** The minimum difference between range values. Default 0. */
	minDistance?: number;
	/** The visible label and accessible name. */
	label: string;
	/** Hides the visible label. Default false. */
	hideLabel?: boolean;
	/** Enables step markers. Default false. */
	showStepMarkers?: boolean;
	/** Disables user input. Default false. */
	disabled?: boolean;
	/** Formats visible and accessible value text. */
	formatValue?: (value: number) => string;
	/** Hides the visible value. Default false. */
	hideValue?: boolean;
}

export interface SliderEmits {
	/** Emits when user input changes the value. */
	'update:modelValue': [value: SliderValue];
	/** Emits when a user interaction ends. */
	valueCommit: [value: SliderValue];
}
