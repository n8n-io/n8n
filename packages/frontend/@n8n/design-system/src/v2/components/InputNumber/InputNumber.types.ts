import type { NumberFieldRootProps, NumberFieldRootEmits } from 'reka-ui';

export type InputNumberSize = 'mini' | 'small' | 'medium' | 'large' | 'xlarge';
export type InputNumberControlsPosition = 'both' | 'right';

export type InputNumberProps = Omit<NumberFieldRootProps, 'formatOptions'> & {
	size?: InputNumberSize;
	precision?: number;
	controls?: boolean;
	controlsPosition?: InputNumberControlsPosition;
	placeholder?: string;
};

export type InputNumberEmits = NumberFieldRootEmits & {
	focus: [event: FocusEvent];
	blur: [event: FocusEvent];
};

export type InputNumberSlots = {
	increment: () => unknown;
	decrement: () => unknown;
};
