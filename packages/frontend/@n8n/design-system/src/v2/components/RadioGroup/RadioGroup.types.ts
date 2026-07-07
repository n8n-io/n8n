import type { RadioGroupRootProps } from './reka-ui';

export type RadioGroupValue = string;

export type RadioGroupProps = Omit<RadioGroupRootProps, 'modelValue' | 'defaultValue'> & {
	modelValue?: RadioGroupValue;
	defaultValue?: RadioGroupValue;
};

export type RadioGroupEmits = {
	'update:modelValue': [value: RadioGroupValue];
};

export type RadioGroupSlots = {
	default(): unknown;
};
