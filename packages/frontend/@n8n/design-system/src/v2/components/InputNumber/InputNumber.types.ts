import type { NumberFieldRootProps, NumberFieldRootEmits } from 'reka-ui';

export type InputNumberSize = 'mini' | 'small' | 'medium' | 'large' | 'xlarge';
export type InputNumberControlsPosition = 'both' | 'right';

export type InputNumberProps = Omit<NumberFieldRootProps, 'formatOptions'> & {
	size?: InputNumberSize;
	/** Maps to Reka `formatOptions` fraction digits when set. */
	precision?: number;
	controls?: boolean;
	controlsPosition?: InputNumberControlsPosition;
	placeholder?: string;
};

export type InputNumberEmits = NumberFieldRootEmits & {
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
};

export type InputNumberControlSlotProps = {
	ui: { class: string };
};

export type InputNumberSlots = {
	/** Custom increment control content (inside the control button). */
	increment?: (props: InputNumberControlSlotProps) => unknown;
	/** Custom decrement control content (inside the control button). */
	decrement?: (props: InputNumberControlSlotProps) => unknown;
};
