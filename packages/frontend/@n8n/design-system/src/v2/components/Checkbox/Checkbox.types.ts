import type { CheckboxRootProps } from 'reka-ui';

export type CheckboxProps = Pick<
	CheckboxRootProps,
	'disabled' | 'required' | 'name' | 'value' | 'id' | 'defaultValue' | 'as'
> & {
	label?: string;
	indeterminate?: boolean;
};

export type CheckboxSlots = {
	label(props: { label?: string }): unknown;
};

export type CheckboxEmits = {
	change: [event: Event];
};
