import type { ComboboxContentProps, ComboboxRootEmits, ComboboxRootProps } from './reka-ui';
import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';

export type ComboboxValue = string;

export type ComboboxOptionBase<TValue extends ComboboxValue = ComboboxValue> = {
	type?: 'item';
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	/**
	 * String used for typeahead filtering. Defaults to `label`.
	 * Set this when the filter text should differ from the displayed label
	 * (e.g. include synonyms or a slot-rendered label).
	 */
	textValue?: string;
};

export type ComboboxLabelItem = {
	type: 'label';
	label: string;
};

export type ComboboxSeparatorItem = {
	type: 'separator';
};

export type ComboboxStructuralItem = ComboboxLabelItem | ComboboxSeparatorItem;

export type ComboboxItem<TValue extends ComboboxValue = ComboboxValue> =
	| ComboboxOptionBase<TValue>
	| ComboboxStructuralItem;

export type ComboboxProps = Omit<ComboboxRootProps<ComboboxValue>, 'dir' | 'openOnFocus'> &
	Pick<ComboboxContentProps, 'side' | 'sideOffset' | 'align'> & {
		size?: ComboboxSizes;
		icon?: IconName;
		placeholder?: string;
		autoFocus?: boolean;
		emptyText?: string;
		items?: ComboboxItem[];
		contentClass?: string;
		id?: string;
		clearable?: boolean;
		teleported?: boolean;
		portalTarget?: string | HTMLElement;
	};

export type ComboboxEmits = ComboboxRootEmits<ComboboxValue | ComboboxValue[] | undefined>;

export type ComboboxSizes = InputSize;

type ComboboxItemUi = { class: string };

type SlotProps = (props: { item: ComboboxOptionBase; ui: ComboboxItemUi }) => unknown;

export type ComboboxItemSlots = {
	['item-leading']?: SlotProps;
	['item-label']?: (props: { item: ComboboxOptionBase }) => unknown;
	['item-trailing']?: SlotProps;
};

export type ComboboxSlots = {
	item?: (props: { item: ComboboxOptionBase }) => unknown;
	label?: (props: { item: ComboboxLabelItem }) => unknown;
	['item-leading']?: SlotProps;
	['item-label']?: (props: { item: ComboboxOptionBase }) => unknown;
	['item-trailing']?: SlotProps;
};
