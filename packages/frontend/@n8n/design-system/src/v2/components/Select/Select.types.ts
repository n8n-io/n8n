import type { SelectRootEmits, SelectRootProps } from 'reka-ui';

import type { IconName } from '../../../components/N8nIcon/icons';
import type {
	AcceptableValue,
	ArrayOrNested,
	GetItemKeys,
	GetModelValue,
	GetModelValueEmits,
	NestedItem,
} from '../../utils/types';

type VueCssClass = string | Record<string, boolean> | Array<string | Record<string, boolean>>;

export type SelectValue = AcceptableValue;
export type SelectItem =
	| SelectValue
	| {
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
			[key: string]: unknown;
	  };

export type SelectProps<
	T extends ArrayOrNested<SelectItem> = ArrayOrNested<SelectItem>,
	VK extends GetItemKeys<T> = 'value',
	M extends boolean = false,
> = Omit<SelectRootProps<T>, 'dir' | 'multiple' | 'modelValue' | 'defaultValue' | 'by'> & {
	id?: string;
	/** The placeholder text when the select is empty. */
	placeholder?: string;
	/**
	 * @defaultValue 'small'
	 */
	size?: 'xsmall' | 'small' | 'medium';
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

	variant?: 'default' | 'ghost';

	/** Icon to be displayed in the trigger */
	icon?: IconName;
};

export type SelectEmits<
	A extends ArrayOrNested<SelectItem>,
	VK extends GetItemKeys<A> | undefined,
	M extends boolean,
> = Omit<SelectRootEmits, 'update:modelValue'> & GetModelValueEmits<A, VK, M>;

type SlotProps<T extends SelectItem> = (props: { item: T; index: number }) => unknown;

export type SelectSlots<
	A extends ArrayOrNested<SelectItem> = ArrayOrNested<SelectItem>,
	VK extends GetItemKeys<A> | undefined = undefined,
	M extends boolean = false,
	T extends NestedItem<A> = NestedItem<A>,
> = {
	default(props: { modelValue?: GetModelValue<A, VK, M>; open: boolean }): unknown;
	item: SlotProps<T>;
	['item-leading']: SlotProps<T>;
	['item-label']: SlotProps<T>;
	['item-trailing']: SlotProps<T>;
};
