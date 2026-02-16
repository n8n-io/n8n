import type { IconOrEmoji } from '../../../components/N8nIconPicker/types';

type VueCssClass = undefined | string | Record<string, boolean> | Array<string | VueCssClass>;

export type DropdownMenuPlacement =
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

export type DropdownMenuSide = 'top' | 'bottom' | 'left' | 'right';
export type DropdownMenuAlign = 'start' | 'end' | 'center';

export type DropdownMenuTrigger = 'click' | 'hover';

export type DropdownMenuItemProps<T = string, D = never> = {
	/** Unique identifier for the item */
	id: T;
	/** Display text for the item */
	label: string;
	/** Icon or emoji displayed before the label */
	icon?: IconOrEmoji;
	/** Whether the item is disabled */
	disabled?: boolean;
	/** Whether to show a separator above the item */
	divided?: boolean;
	/** Whether to show a checkmark indicator */
	checked?: boolean;
	/** Additional CSS classes */
	class?: VueCssClass;
	/** Nested menu items (creates a sub-menu) */
	children?: Array<DropdownMenuItemProps<T, D>>;
	/** Whether to show loading state in sub-menu */
	loading?: boolean;
	/** Number of skeleton items to show when loading */
	loadingItemCount?: number;
	/** Enable search functionality for this item's children */
	searchable?: boolean;
	/** Search input placeholder */
	searchPlaceholder?: string;
	/** Whether this item is currently highlighted via keyboard navigation */
	highlighted?: boolean;
	/** Whether this item's sub-menu should be open (controlled by parent for keyboard nav) */
	subMenuOpen?: boolean;
	/** extra data useful for rendering leading/trailing slot */
	data?: D;
};

export interface DropdownMenuProps<T = string, D = never> {
	/** Unique identifier for the dropdown */
	id?: string;
	/** Array of menu items to display */
	items: Array<DropdownMenuItemProps<T, D>>;
	/** The controlled open state of the dropdown. Can be bind as `v-model` */
	modelValue?: boolean;
	/** The open state of the dropdown when initially rendered */
	defaultOpen?: boolean;
	/** Dropdown placement relative to trigger */
	placement?: DropdownMenuPlacement;
	/** How the dropdown is triggered */
	trigger?: DropdownMenuTrigger;
	/** Icon or emoji for the default trigger button */
	activatorIcon?: IconOrEmoji;
	/** When true, prevents the user from interacting with dropdown */
	disabled?: boolean;
	/** Whether to teleport the dropdown to body */
	teleported?: boolean;
	/** Maximum height of the dropdown menu */
	maxHeight?: string | number;
	/** Whether to show loading state */
	loading?: boolean;
	/** Number of skeleton items to show when loading */
	loadingItemCount?: number;
	/** Additional CSS class for the dropdown popper */
	extraPopperClass?: string;
	/** Enable search functionality */
	searchable?: boolean;
	/** Search input placeholder */
	searchPlaceholder?: string;
	/** Debounce delay in ms for search event */
	searchDebounce?: number;
	/** Text to be shown when no menu item exists */
	emptyText?: string;
}

export interface DropdownMenuEmits<T = string> {
	/** Emitted when dropdown open state changes */
	(e: 'update:modelValue', open: boolean): void;
	/** Emitted when a menu item is selected */
	(e: 'select', value: T): void;
	/** Emitted when search input value changes (debounced). itemId is undefined for root-level search, or the item's ID for sub-menu search */
	(e: 'search', searchTerm: string, itemId?: T): void;
	/** Emitted when a sub-menu opens or closes */
	(e: 'submenu:toggle', itemId: T, open: boolean): void;
}

type SlotUiProps = { class: string };

export interface DropdownMenuSlots<T = string, D = never> {
	/** Custom trigger element (replaces default button) */
	trigger?: () => void;
	/** Complete custom dropdown content (replaces item list) */
	content?: () => void;
	/** Custom item rendering (replaces default N8nDropdownMenuItem) */
	item?: (props: { item: DropdownMenuItemProps<T, D> }) => void;
	/** Pass-through to N8nDropdownMenuItem */
	'item-leading'?: (props: { item: DropdownMenuItemProps<T, D>; ui: SlotUiProps }) => void;
	/** Pass-through to N8nDropdownMenuItem - replaces the label text */
	'item-label'?: (props: { item: DropdownMenuItemProps<T, D>; ui: SlotUiProps }) => void;
	/** Pass-through to N8nDropdownMenuItem */
	'item-trailing'?: (props: { item: DropdownMenuItemProps<T, D>; ui: SlotUiProps }) => void;
	/** Custom loading state */
	loading?: () => void;
	/** Custom empty state when no items */
	empty?: () => void;
	/** Icon or content before the search input (default: search icon) */
	'search-prefix'?: () => void;
	/** Icon or content after the search input */
	'search-suffix'?: () => void;
}

export interface DropdownMenuItemSlots<T = string, D = never> {
	/** Content before the label (default: icon if provided) */
	'item-leading'?: (props: { item: DropdownMenuItemProps<T, D>; ui: SlotUiProps }) => void;
	/** Content that replaces the label text (default: label string) */
	'item-label'?: (props: { item: DropdownMenuItemProps<T, D>; ui: SlotUiProps }) => void;
	/** Content after the label (badges, shortcuts, etc.) */
	'item-trailing'?: (props: { item: DropdownMenuItemProps<T, D>; ui: SlotUiProps }) => void;
}
