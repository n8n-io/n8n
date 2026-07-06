import type { AcceptableValue, RadioGroupRootProps } from './reka-ui';

export type RadioGroupProps<T extends AcceptableValue = AcceptableValue> = Omit<
	RadioGroupRootProps,
	'modelValue' | 'defaultValue'
> & {
	modelValue?: T;
	defaultValue?: T;
};

export type RadioGroupEmits<T extends AcceptableValue = AcceptableValue> = {
	'update:modelValue': [value: T];
};

export type RadioGroupSlots = {
	default(): unknown;
};

export type { AcceptableValue };
