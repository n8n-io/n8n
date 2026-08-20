import type { SelectRootEmits, SelectRootProps } from 'reka-ui';

import type { IconName } from '../../../components/N8nIcon/icons';

export type SelectValue = string | number;

export type SelectOptionBase<TValue extends SelectValue = SelectValue> = {
	type?: 'item';
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	/**
	 * String used for search filtering and typeahead. Defaults to `label`.
	 * Set this when the filter text should differ from the displayed label
	 * (e.g. a slot-rendered label).
	 */
	textValue?: string;
	/**
	 * Extra strings matched during `searchable` filtering (e.g. synonyms).
	 * Does not replace `textValue`. Not used by typeahead, which matches the
	 * prefix of `textValue` / `label`.
	 */
	keywords?: string[];
	/**
	 * Called when the item is chosen. Call `event.preventDefault()` to keep the
	 * selection from updating (e.g. footer actions that open a modal).
	 */
	onSelect?: (event: Event) => void;
};

export type SelectGroupItem<TValue extends SelectValue = SelectValue> = {
	type: 'group';
	label?: string;
	items: Array<SelectOptionBase<TValue>>;
};

export type SelectSeparatorItem = {
	type: 'separator';
};

export type SelectStructuralItem<TValue extends SelectValue = SelectValue> =
	| SelectGroupItem<TValue>
	| SelectSeparatorItem;

export type SelectItem<TValue extends SelectValue = SelectValue> =
	| SelectOptionBase<TValue>
	| SelectStructuralItem<TValue>;

export type SelectVariants = 'default' | 'ghost' | 'flush';

export type SelectSizes = 'mini' | 'small' | 'medium' | 'large' | 'xlarge';

export type SelectModelValue<M extends boolean = false> = M extends true
	? SelectValue[]
	: SelectValue;

export type SelectProps<M extends boolean = false> = Omit<
	SelectRootProps,
	'multiple' | 'modelValue' | 'defaultValue' | 'by' | 'side' | 'align'
> & {
	id?: string;
	placeholder?: string;
	/**
	 * @defaultValue 'small'
	 */
	size?: SelectSizes;
	items?: SelectItem[];
	defaultValue?: SelectModelValue<M>;
	modelValue?: SelectModelValue<M>;
	multiple?: M & boolean;
	variant?: SelectVariants;
	icon?: IconName;
	clearable?: boolean;

	/**
	 * When `true`, shows a search field at the top of the dropdown and filters
	 * items by `textValue` (falling back to `label`) and `keywords`. Groups and
	 * separators without a matching item are dropped from the filtered list.
	 * @defaultValue false
	 */
	searchable?: boolean;

	/** Placeholder for the search field when `searchable` is true. */
	searchPlaceholder?: string;

	/** Controlled search query. Use with `update:searchQuery` / `v-model:searchQuery`. */
	searchQuery?: string;

	/**
	 * The positioning mode for the dropdown content.
	 * `item-aligned` aligns the selected item with the trigger (default).
	 * `popper` opens below the trigger at trigger width.
	 * @defaultValue 'item-aligned'
	 */
	position?: 'item-aligned' | 'popper';

	/** The distance in pixels from the trigger when position is 'popper'. @defaultValue 4 */
	sideOffset?: number;

	/** Additional CSS class(es) applied to the dropdown content container (portaled). */
	contentClass?: string;
};

export type SelectEmits<M extends boolean = false> = Omit<SelectRootEmits, 'update:modelValue'> & {
	'update:modelValue': [value: SelectModelValue<M> | undefined];
	'update:searchQuery': [value: string];
	clear: [];
};

export type SelectItemUi = { class: string; strokeWidth?: number };

export type SelectItemSlotProps = (props: {
	item: SelectOptionBase;
	ui: SelectItemUi;
}) => unknown;

export type SelectItemSlots = {
	['item-leading']?: SelectItemSlotProps;
	['item-label']?: (props: { item: SelectOptionBase }) => unknown;
	['item-trailing']?: SelectItemSlotProps;
};

export type SelectSlots<M extends boolean = false> = SelectItemSlots & {
	default(props: { modelValue?: SelectModelValue<M>; open: boolean }): unknown;
	item: (props: { item: SelectOptionBase }) => unknown;
	label: (props: { item: SelectGroupItem }) => unknown;
	header?: () => unknown;
	footer?: () => unknown;
	empty?: () => unknown;
};
