import type { SelectRootEmits, SelectRootProps } from 'reka-ui';

import type { IconName } from '../../../components/N8nIcon/icons';
import type {
	AcceptableValue,
	GetItemKeys,
	GetModelValue,
	GetModelValueEmits,
} from '../../utils/types';

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

export type SelectVariants = 'default' | 'ghost';
export type SelectSizes = 'xsmall' | 'small' | 'medium';

export type SelectProps<
	T extends SelectItem[] = SelectItem[],
	VK extends GetItemKeys<T> = 'value',
	M extends boolean = false,
> = Omit<SelectRootProps<T>, 'dir' | 'multiple' | 'modelValue' | 'defaultValue' | 'by'> & {
	id?: string;
	/** The placeholder text when the select is empty. */
	placeholder?: string;
	/**
	 * @defaultValue 'small'
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
};

export type SelectEmits<
	A extends SelectItem[],
	VK extends GetItemKeys<A> | undefined,
	M extends boolean,
> = Omit<SelectRootEmits, 'update:modelValue'> & GetModelValueEmits<A, VK, M>;

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
};
