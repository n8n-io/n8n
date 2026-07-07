import type { AcceptableValue, RadioGroupRootProps } from './reka-ui';

export type RadioGroupProps = Omit<RadioGroupRootProps, 'modelValue' | 'defaultValue'> & {
	modelValue?: AcceptableValue;
	defaultValue?: AcceptableValue;
};

export type RadioGroupEmits = {
	'update:modelValue': [value: AcceptableValue];
};

export type RadioGroupSlots = {
	default(): unknown;
};

export type { AcceptableValue };
