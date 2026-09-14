import type { ClassValue } from 'clsx';
import type { ComputedRef, InjectionKey } from 'vue';

import type { KeyboardShortcut } from '../../types/keyboardshortcut';
import type { IconOrEmoji } from '../N8nIconPicker/types';

export type ContextMenuId = string;

type ContextMenuLeafBase<T extends ContextMenuId = ContextMenuId> = {
	id: T;
	label: string;
	icon?: IconOrEmoji;
	shortcut?: KeyboardShortcut;
	disabled?: boolean;
	class?: ClassValue;
};

type ContextMenuSectionBase<T extends ContextMenuId = ContextMenuId> = {
	id: T;
	label?: string;
	class?: ClassValue;
};

export type ContextMenuItem<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
	type: 'item';
	keepOpen?: boolean;
	variant?: 'default' | 'destructive';
};

export type ContextMenuRadio<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
	type: 'radio';
};

export type ContextMenuCheckbox<T extends ContextMenuId = ContextMenuId> =
	ContextMenuLeafBase<T> & {
		type: 'checkbox';
	};

export type ContextMenuGroup<T extends ContextMenuId = ContextMenuId> =
	ContextMenuSectionBase<T> & {
		type: 'group';
		children: Array<ContextMenuNode<T>>;
	};

export type ContextMenuSubmenu<T extends ContextMenuId = ContextMenuId> = ContextMenuLeafBase<T> & {
	type: 'submenu';
	children: Array<ContextMenuNode<T>>;
	loading?: boolean;
	loadingItemCount?: number;
};

export type ContextMenuRadioGroup<T extends ContextMenuId = ContextMenuId> =
	ContextMenuSectionBase<T> & {
		type: 'radio-group';
		children: Array<ContextMenuRadio<T>>;
	};

/** Entries in `items` and in group/submenu `children`. Radio is not a node; nest it in `radio-group`. */
export type ContextMenuNode<T extends ContextMenuId = ContextMenuId> =
	| ContextMenuItem<T>
	| ContextMenuCheckbox<T>
	| ContextMenuGroup<T>
	| ContextMenuSubmenu<T>
	| ContextMenuRadioGroup<T>;

/** A row `N8nContextMenuItem` can render, including radio (which is not a node). */
export type ContextMenuLeaf<T extends ContextMenuId = ContextMenuId> =
	| ContextMenuItem<T>
	| ContextMenuRadio<T>
	| ContextMenuCheckbox<T>
	| ContextMenuSubmenu<T>;

export type ContextMenuProps<T extends ContextMenuId = ContextMenuId> = {
	/** HTML id for the menu content element. */
	id?: string;
	/** Menu tree to render. */
	items: Array<ContextMenuNode<T>>;
	/**
	 * Controlled open state. Bind with `v-model:open`.
	 * @defaultValue uncontrolled
	 */
	open?: boolean;
	/**
	 * Open state on first render when `open` is not set.
	 * @defaultValue false
	 */
	defaultOpen?: boolean;
	/**
	 * Controlled selected ids for checkbox and radio items. Bind with `v-model:selectedValues`.
	 * @defaultValue uncontrolled
	 */
	selectedValues?: T[];
	/**
	 * Selected ids on first render when `selectedValues` is not set.
	 * @defaultValue []
	 */
	defaultSelectedValues?: T[];
	/**
	 * When true, the trigger cannot open the menu.
	 * @defaultValue false
	 */
	disabled?: boolean;
	/**
	 * When true, shows skeleton rows instead of items.
	 * @defaultValue false
	 */
	loading?: boolean;
	/**
	 * Number of skeleton rows to show while loading.
	 * @defaultValue 3
	 */
	loadingItemCount?: number;
	/** Extra CSS class for the menu content element. */
	contentClass?: ClassValue;
	/**
	 * When true, blocks interaction with the rest of the page while open.
	 * Canvas menus set this to false.
	 * @defaultValue true
	 */
	modal?: boolean;
};

export type ContextMenuEmits<T extends ContextMenuId = ContextMenuId> = {
	'update:open': [open: boolean];
	'update:selectedValues': [value: T[]];
	select: [value: T];
	'submenu:toggle': [itemId: T, open: boolean];
	'close-auto-focus': [event: Event];
};

type SlotUiProps = { class: string };

export type ContextMenuSlots<T extends ContextMenuId = ContextMenuId> = {
	trigger?: () => void;
	item?: (props: { item: ContextMenuLeaf<T> }) => void;
	'item-leading'?: (props: { item: ContextMenuLeaf<T>; ui: SlotUiProps }) => void;
	'item-label'?: (props: { item: ContextMenuLeaf<T>; ui: SlotUiProps }) => void;
	'item-trailing'?: (props: { item: ContextMenuLeaf<T>; ui: SlotUiProps }) => void;
	loading?: () => void;
	empty?: () => void;
};

export type ContextMenuItemProps<T extends ContextMenuId = ContextMenuId> = {
	item: ContextMenuLeaf<T>;
};

export type ContextMenuItemEmits<T extends ContextMenuId = ContextMenuId> = {
	select: [value: T];
	'toggle-checkbox': [id: T];
	'submenu:toggle': [open: boolean];
};

export type ContextMenuItemSlots<T extends ContextMenuId = ContextMenuId> = Pick<
	ContextMenuSlots<T>,
	'item' | 'item-leading' | 'item-label' | 'item-trailing' | 'empty'
>;

export type ContextMenuExposed = {
	open: (position?: [number, number]) => void;
	close: () => void;
};

export type ContextMenuState = {
	selectedValues: Pick<ComputedRef<readonly string[]>, 'value'>;
	onSelect(id: string, keepOpen?: boolean): void;
	onToggleCheckbox(id: string): void;
	onSelectRadio(groupId: string, radioId: string): void;
	onSubmenuToggle(itemId: string, open: boolean): void;
};

export const ContextMenuStateKey: InjectionKey<ContextMenuState> = Symbol('N8nContextMenuState');
