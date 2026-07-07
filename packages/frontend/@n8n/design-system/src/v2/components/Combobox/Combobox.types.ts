import type { IconName } from '../../../components/N8nIcon/icons';
import type { InputSize } from '../../../components/N8nInput/Input.types';

export type AcceptableValue = string | number | bigint | Record<string, unknown> | null;

export type ComboboxProps<T extends AcceptableValue = AcceptableValue> = {
	/** The controlled open state of the Combobox. Can be binded with `v-model:open`. */
	open?: boolean;
	/** The open state of the combobox when it is initially rendered. */
	defaultOpen?: boolean;
	/** When `true`, prevents the user from interacting with the combobox. */
	disabled?: boolean;
	required?: boolean;
	multiple?: boolean;
	name?: string;
	/** The controlled value of the Combobox. Can be binded with `v-model`. */
	modelValue?: T | T[];
	/** The value of the Combobox when initially rendered. */
	defaultValue?: T | T[];
	/** When `true`, disable the default filters. */
	ignoreFilter?: boolean;
	/** Whether to reset the searchTerm when the Combobox input blurred. @defaultValue `true` */
	resetSearchTermOnBlur?: boolean;
	/** Whether to reset the searchTerm when the Combobox value is selected. @defaultValue `true` */
	resetSearchTermOnSelect?: boolean;
	/** Whether to open the combobox when the input is focused. @defaultValue `false` */
	openOnFocus?: boolean;
	/** Whether to open the combobox when the input is clicked. @defaultValue `false` */
	openOnClick?: boolean;
	highlightOnHover?: boolean;
	/** Forwarded to ComboboxInput */
	id?: string;
	placeholder?: string;
	autoFocus?: boolean;
	/** Forwarded to ComboboxContent */
	side?: 'top' | 'right' | 'bottom' | 'left';
	sideOffset?: number;
	emptyText?: string;
	size?: ComboboxSizes;
	valueKey?: string;
	labelKey?: string;
	items?: ComboboxItem[];
	icon?: IconName;
	contentClass?: string;
};

export type ComboboxEmits<T extends AcceptableValue = AcceptableValue> = {
	'update:modelValue': [value: T | T[]];
	'update:open': [value: boolean];
	highlight: [payload: { ref: HTMLElement; value: T } | undefined];
};

export type ComboboxListItem = {
	label?: string;
	value?: AcceptableValue;
	textValue?: string;
	type?: 'label' | 'separator' | 'item';
	icon?: IconName;
	size?: ComboboxSizes;
	disabled?: boolean;
	class?: string;
	onSelect?: (event: Event) => void;
};

export type ComboboxItem = AcceptableValue | ComboboxListItem;

export type ComboboxSizes = InputSize;

type SlotProps = (props: { item: ComboboxListItem; ui: Record<string, unknown> }) => unknown;

export type ComboboxSlots = {
	default(props: { modelValue?: AcceptableValue | AcceptableValue[]; open: boolean }): unknown;
	item: (props: { item: ComboboxListItem }) => unknown;
	label: (props: { item: ComboboxListItem }) => unknown;
	['item-leading']: SlotProps;
	['item-label']: (props: { item: ComboboxListItem }) => unknown;
	['item-trailing']: SlotProps;
	header?: () => unknown;
	footer?: () => unknown;
};
