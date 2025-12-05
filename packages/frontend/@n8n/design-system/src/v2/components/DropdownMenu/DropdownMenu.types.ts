import type { IconName } from '../../../components/N8nIcon/icons';

type VueCssClass = undefined | string | Record<string, boolean> | Array<string | VueCssClass>;

export type Placement =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'left'
	| 'left-start'
	| 'left-end'
	| 'right'
	| 'right-start'
	| 'right-end';

export type DropdownMenuTrigger = 'click' | 'hover';

export type DropdownMenuItemProps<T = string> = {
	/** Unique identifier for the item */
	id: T;
	/** Display text for the item */
	label: string;
	/** Icon displayed before the label */
	icon?: IconName;
	/** Whether the item is disabled */
	disabled?: boolean;
	/** Whether to show a separator above the item */
	divided?: boolean;
	/** Whether to show a checkmark indicator */
	checked?: boolean;
	/** Additional CSS classes */
	class?: VueCssClass;
	/** Nested menu items (creates a sub-menu) */
	children?: Array<DropdownMenuItemProps<T>>;
};

export interface DropdownMenuProps<T = string> {
	/** Unique identifier for the dropdown */
	id?: string;
	/** Array of menu items to display */
	items: Array<DropdownMenuItemProps<T>>;
	/** The controlled open state of the dropdown. Can be bind as `v-model` */
	modelValue?: boolean;
	/** The open state of the dropdown when initially rendered */
	defaultOpen?: boolean;
	/** Dropdown placement relative to trigger */
	placement?: Placement;
	/** How the dropdown is triggered */
	trigger?: DropdownMenuTrigger;
	/** Icon for the default trigger button */
	activatorIcon?: IconName;
	/** When true, prevents the user from interacting with dropdown */
	disabled?: boolean;
	/** Whether to teleport the dropdown to body */
	teleported?: boolean;
	/** Maximum height of the dropdown menu */
	maxHeight?: string | number;
	/** Whether to hide the dropdown arrow/caret */
	hideArrow?: boolean;
	/** Whether to show loading state */
	loading?: boolean;
	/** Number of skeleton items to show when loading */
	loadingItemCount?: number;
	/** Additional CSS class for the dropdown popper */
	extraPopperClass?: string;
}

export interface DropdownMenuEmits<T = string> {
	/** Emitted when dropdown open state changes */
	(e: 'update:modelValue', open: boolean): void;
	/** Emitted when a menu item is selected */
	(e: 'select', value: T): void;
}

type SlotUiProps = { class: string };

export interface DropdownMenuSlots<T = string> {
	/** Custom trigger element (replaces default button) */
	trigger: () => void;
	/** Complete custom dropdown content (replaces item list) */
	content: () => void;
	/** Custom item rendering (replaces default N8nDropdownMenuItem) */
	item: (props: { item: DropdownMenuItemProps<T> }) => void;
	/** Pass-through to N8nDropdownMenuItem */
	'item-leading': (props: { item: DropdownMenuItemProps<T>; ui: SlotUiProps }) => void;
	/** Pass-through to N8nDropdownMenuItem */
	'item-label': (props: { item: DropdownMenuItemProps<T> }) => void;
	/** Pass-through to N8nDropdownMenuItem */
	'item-trailing': (props: { item: DropdownMenuItemProps<T>; ui: SlotUiProps }) => void;
	/** Custom loading state */
	loading: () => void;
}

export interface DropdownMenuItemSlots<T = string> {
	/** Content before the label (default: icon if provided) */
	'item-leading': (props: { item: DropdownMenuItemProps<T>; ui: SlotUiProps }) => void;
	/** Custom label content (default: label text) */
	'item-label': (props: { item: DropdownMenuItemProps<T> }) => void;
	/** Content after the label (badges, shortcuts, etc.) */
	'item-trailing': (props: { item: DropdownMenuItemProps<T>; ui: SlotUiProps }) => void;
}
