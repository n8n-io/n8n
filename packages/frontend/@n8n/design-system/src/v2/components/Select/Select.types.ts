import type {
	AcceptableValue as RekaAcceptableValue,
	SelectRootEmits,
	SelectRootProps,
} from 'reka-ui';

import type { IconName } from '../../../components/N8nIcon/icons';

export type SelectValue = string | number | boolean;

export type SelectOptionBase<TValue extends SelectValue = SelectValue> = {
	type?: 'item';
	value: TValue;
	label: string;
	icon?: IconName;
	disabled?: boolean;
	/**
	 * String used for search filtering. Defaults to `label`.
	 * Set this when the filter text should differ from the displayed label
	 * (e.g. include synonyms or a slot-rendered label).
	 */
	textValue?: string;
	onSelect?: (e: Event) => void;
};

export type SelectLabelItem = {
	type: 'label';
	label: string;
};

export type SelectSeparatorItem = {
	type: 'separator';
};

export type SelectStructuralItem = SelectLabelItem | SelectSeparatorItem;

export type SelectItem<TValue extends SelectValue = SelectValue> =
	| SelectOptionBase<TValue>
	| SelectStructuralItem;

export type SelectVariants = 'default' | 'ghost' | 'flush';
/** Matches `N8nInput` / shared input size tokens. */
export type SelectSizes = 'mini' | 'small' | 'medium' | 'large' | 'xlarge';

export type SelectModelValue<M extends boolean = false> = M extends true
	? SelectValue[]
	: SelectValue;

export type SelectProps<M extends boolean = false> = Omit<
	SelectRootProps,
	'multiple' | 'modelValue' | 'defaultValue' | 'by'
> & {
	id?: string;
	/** The placeholder text when the select is empty. */
	placeholder?: string;
	/**
	 * @defaultValue 'small'
	 */
	size?: SelectSizes;
	items?: SelectItem[];
	/** The value of the Select when initially rendered. Use when you do not need to control the state of the Select. */
	defaultValue?: SelectModelValue<M>;
	/** The controlled value of the Select. Can be bind as `v-model`. */
	modelValue?: SelectModelValue<M>;
	/** Whether multiple options can be selected or not. */
	multiple?: M & boolean;

	variant?: SelectVariants;

	/** Icon to be displayed in the trigger */
	icon?: IconName;

	/**
	 * When `true`, shows a clear button when a value is selected.
	 * @defaultValue false
	 */
	clearable?: boolean;

	/**
	 * When `true`, shows a search field at the top of the dropdown and filters items by label.
	 * @defaultValue false
	 */
	searchable?: boolean;

	/** Placeholder for the search field when `searchable` is true. */
	searchPlaceholder?: string;

	/** Controlled search query. Use with `update:searchQuery` / `v-model:searchQuery`. */
	searchQuery?: string;

	/**
	 * The positioning mode for the dropdown content.
	 * `popper` opens below the trigger at trigger width (default).
	 * `item-aligned` aligns the selected item with the trigger.
	 * @defaultValue 'popper'
	 */
	position?: 'item-aligned' | 'popper';

	/** The preferred side when position is 'popper'. @defaultValue 'bottom' */
	side?: 'top' | 'right' | 'bottom' | 'left';

	/** The distance in pixels from the trigger when position is 'popper'. @defaultValue 5 */
	sideOffset?: number;

	/** Additional CSS class(es) applied to the dropdown content container (portaled). */
	contentClass?: string;
};

export type SelectEmits<M extends boolean = false> = Omit<SelectRootEmits, 'update:modelValue'> & {
	'update:modelValue': [value: SelectModelValue<M> | undefined];
	'update:searchQuery': [value: string];
	clear: [];
};

type SlotProps = (props: { item: SelectOptionBase; ui: Record<string, unknown> }) => unknown;

export type SelectSlots<M extends boolean = false> = {
	default(props: { modelValue?: SelectModelValue<M>; open: boolean }): unknown;
	item: (props: { item: SelectOptionBase }) => unknown;
	label: (props: { item: SelectLabelItem }) => unknown;
	['item-leading']: SlotProps;
	['item-label']: (props: { item: SelectOptionBase }) => unknown;
	['item-trailing']: SlotProps;
	header?: () => unknown;
	footer?: () => unknown;
	empty?: () => unknown;
};

/** Narrows a value to Reka UI's AcceptableValue (excludes boolean). */
export function isRekaAcceptableValue(value: unknown): value is RekaAcceptableValue {
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'bigint' ||
		(typeof value === 'object' && value !== null)
	);
}

export function isStructuralItem(item: SelectItem): item is SelectStructuralItem {
	return item.type === 'label' || item.type === 'separator';
}

export function isOptionItem(item: SelectItem): item is SelectOptionBase {
	return !isStructuralItem(item);
}
