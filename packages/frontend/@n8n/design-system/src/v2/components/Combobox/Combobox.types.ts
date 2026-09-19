import type { ComboboxContentProps, ComboboxRootEmits, ComboboxRootProps } from './reka-ui';
import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';

export type ComboboxValue = string;

export type ComboboxOptionBase<TValue extends ComboboxValue = ComboboxValue> = {
	type?: 'item';
	header?: false;
	divided?: boolean;
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	/**
	 * String used for typeahead filtering. Defaults to `label`.
	 * Set this when the filter text should differ from the displayed label
	 * (e.g. a slot-rendered label).
	 */
	textValue?: string;
	/**
	 * Extra strings matched during typeahead filtering (e.g. synonyms).
	 * Does not replace `textValue` — both the base filter text and these
	 * keywords are checked.
	 */
	keywords?: string[];
	/**
	 * Called when the item is chosen. Call `event.preventDefault()` to keep the
	 * selection from updating (e.g. footer actions that open a modal).
	 */
	onSelect?: (event: Event) => void;
};

export type ComboboxHeaderItem = {
	header: true;
	label: string;
	divided?: boolean;
};

export type ComboboxItem<TValue extends ComboboxValue = ComboboxValue> =
	| ComboboxOptionBase<TValue>
	| ComboboxHeaderItem;

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
	label?: (props: { item: ComboboxHeaderItem }) => unknown;
	['item-leading']?: SlotProps;
	['item-label']?: (props: { item: ComboboxOptionBase }) => unknown;
	['item-trailing']?: SlotProps;
};
