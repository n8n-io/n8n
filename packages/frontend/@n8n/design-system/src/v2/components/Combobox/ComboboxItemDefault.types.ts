import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';

type ComboboxItemDefaultUi = { class: string };

export type ComboboxItemDefaultSlots = {
	'item-leading'?: (props: {
		item: ComboboxItemDefaultProps;
		ui: ComboboxItemDefaultUi;
	}) => unknown;
	'item-label'?: (props: { item: ComboboxItemDefaultProps }) => unknown;
	'item-trailing'?: (props: {
		item: ComboboxItemDefaultProps;
		ui: ComboboxItemDefaultUi;
	}) => unknown;
	'item-indicator'?: (props: { ui: ComboboxItemDefaultUi }) => unknown;
};

export type ComboboxItemDefaultProps = {
	label?: string;
	icon?: IconName;
	disabled?: boolean;
	size?: InputSize;
};
