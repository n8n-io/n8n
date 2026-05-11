import type { SwitchRootProps } from 'reka-ui';

export type SwitchSize = 'small' | 'large';

export type SwitchProps = Pick<
	SwitchRootProps,
	'disabled' | 'required' | 'name' | 'value' | 'id' | 'defaultValue' | 'as'
> & {
	label?: string;
	size?: SwitchSize;
};

export type SwitchSlots = {
	label(props: { label?: string }): unknown;
};

export type SwitchEmits = Record<string, never>;
