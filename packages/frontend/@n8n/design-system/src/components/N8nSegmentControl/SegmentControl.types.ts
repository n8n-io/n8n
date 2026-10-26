import type { RadioGroupRootProps } from 'reka-ui';

export type SegmentControlSize = 'mini' | 'small' | 'default' | 'large' | 'xlarge';

export interface SegmentOption<Value extends string | boolean = string | boolean> {
	label: string;
	value: Value;
	disabled?: boolean;
	data?: Record<string, string | number | boolean | undefined>;
}

export type SegmentControlProps<Value extends string | boolean = string | boolean> = Pick<
	RadioGroupRootProps,
	'name' | 'required' | 'loop' | 'dir'
> & {
	modelValue?: Value;
	defaultValue?: Value;
	options?: Array<SegmentOption<Value>>;
	size?: SegmentControlSize;
	disabled?: boolean;
	squareButtons?: boolean;
};
