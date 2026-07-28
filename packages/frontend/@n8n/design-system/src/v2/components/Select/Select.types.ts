import type {
	AcceptableValue as RekaAcceptableValue,
	SelectRootEmits,
	SelectRootProps,
} from 'reka-ui';

import type { IconName } from '../../../components/N8nIcon/icons';
import type { AcceptableValue, GetItemKeys, GetModelValue } from '../../utils/types';

type VueCssClass = undefined | string | Record<string, boolean> | Array<string | VueCssClass>;

export type SelectItemProps = {
	label?: string;
	/**
	 * The item type.
	 * @defaultValue 'item'
	 */
	type?: 'label' | 'separator' | 'item';
	value?: SelectValue;
	disabled?: boolean;
	onSelect?: (e: Event) => void;
	icon?: IconName;
	class?: VueCssClass;
	strokeWidth?: number;
	[key: string]: unknown;
};

export type SelectValue = AcceptableValue;
export type SelectItem = SelectValue | SelectItemProps;

export type SelectVariants = 'default' | 'ghost' | 'flush';
/** Matches `N8nInput` / shared input size tokens. Default size is `'default'` (small input tokens). */
export type SelectSizes = 'mini' | 'default' | 'medium' | 'large' | 'xlarge';

export type SelectProps<
	T extends SelectItem[] = SelectItem[],
	VK extends GetItemKeys<T> = 'value',
	M extends boolean = false,
> = Omit<SelectRootProps, 'dir' | 'multiple' | 'modelValue' | 'defaultValue' | 'by'> & {
	id?: string;
	/** The placeholder text when the select is empty. */
	placeholder?: string;
	/**
	 * @defaultValue 'default'
	 */
	size?: SelectSizes;
	/**
	 * When `items` is an array of objects, select the field to use as the value.
	 * @defaultValue 'value'
	 */
	valueKey?: VK;
	/**
	 * When `items` is an array of objects, select the field to use as the label.
	 * @defaultValue 'label'
	 */
	labelKey?: GetItemKeys<T>;
	items?: T;
	/** The value of the Select when initially rendered. Use when you do not need to control the state of the Select. */
	defaultValue?: GetModelValue<T, VK, M>;
	/** The controlled value of the Select. Can be bind as `v-model`. */
	modelValue?: GetModelValue<T, VK, M>;
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

export type SelectEmits<
	A extends SelectItem[],
	VK extends GetItemKeys<A> | undefined,
	M extends boolean,
> = Omit<SelectRootEmits, 'update:modelValue'> & {
	'update:modelValue': [value: GetModelValue<A, VK, M> | undefined];
	'update:searchQuery': [value: string];
	clear: [];
};

type SlotProps = (props: { item: SelectItemProps; ui: Record<string, unknown> }) => unknown;

export type SelectSlots<
	A extends SelectItem[] = SelectItem[],
	VK extends GetItemKeys<A> | undefined = undefined,
	M extends boolean = false,
> = {
	default(props: { modelValue?: GetModelValue<A, VK, M>; open: boolean }): unknown;
	item: (props: { item: SelectItemProps }) => unknown;
	label: (props: { item: SelectItemProps }) => unknown;
	['item-leading']: SlotProps;
	['item-label']: (props: { item: SelectItemProps }) => unknown;
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

export function isSelectItemProps(item: SelectItem): item is SelectItemProps {
	return typeof item === 'object' && item !== null;
}
