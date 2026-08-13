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
	/** Fully custom increment control. Default: button with plus/chevron icon. */
	increment?: (props: InputNumberControlSlotProps) => unknown;
	/** Fully custom decrement control. Default: button with minus/chevron icon. */
	decrement?: (props: InputNumberControlSlotProps) => unknown;
};
