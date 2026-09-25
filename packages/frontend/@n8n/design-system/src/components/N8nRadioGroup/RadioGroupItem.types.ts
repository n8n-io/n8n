import type { RadioGroupValue } from './RadioGroup.types';
import type { RadioGroupItemProps as RekaRadioGroupItemProps } from './reka-ui';

export type RadioGroupItemProps = Omit<RekaRadioGroupItemProps, 'value'> & {
	value: RadioGroupValue;
	label?: string;
	description?: string;
};

export type RadioGroupItemSlots = {
	label(props: { label?: string; description?: string }): unknown;
};
