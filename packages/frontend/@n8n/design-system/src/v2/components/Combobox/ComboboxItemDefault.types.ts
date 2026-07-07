import { ComboboxListItem } from './Combobox.types';

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

export type ComboboxItemDefaultProps = Omit<ComboboxListItem, 'value'>;
