import type { RadioGroupItemProps as RekaRadioGroupItemProps } from './reka-ui';

export type RadioGroupItemProps = RekaRadioGroupItemProps & {
	label?: string;
	description?: string;
};

export type RadioGroupItemSlots = {
	default(): unknown;
};
