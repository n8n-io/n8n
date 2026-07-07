import type { AcceptableValue, RadioGroupItemProps as RekaRadioGroupItemProps } from './reka-ui';

export type RadioGroupItemProps = Omit<RekaRadioGroupItemProps, 'value'> & {
	value: AcceptableValue;
	label?: string;
	description?: string;
};

export type RadioGroupItemSlots = {
	label(props: { label?: string; description?: string }): unknown;
};
