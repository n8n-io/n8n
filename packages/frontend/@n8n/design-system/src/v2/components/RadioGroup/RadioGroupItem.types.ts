import type { AcceptableValue, RadioGroupItemProps as RekaRadioGroupItemProps } from './reka-ui';

export type RadioGroupItemProps<T extends AcceptableValue = AcceptableValue> = Omit<
	RekaRadioGroupItemProps,
	'value'
> & {
	value: T;
	label?: string;
	description?: string;
};

export type RadioGroupItemSlots = {
	label(props: { label?: string; description?: string }): unknown;
};
