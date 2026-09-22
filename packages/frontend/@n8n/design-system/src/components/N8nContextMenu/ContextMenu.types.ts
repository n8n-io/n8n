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

export type ContextMenuNode<T extends ContextMenuId = ContextMenuId> =
	| ContextMenuItem<T>
	| ContextMenuCheckbox<T>
	| ContextMenuGroup<T>
	| ContextMenuSubmenu<T>
	| ContextMenuRadioGroup<T>;

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
	/**
	 * Extra CSS class for every panel (root and submenus). Use it for max-height
	 * and to set `--context-menu--width` when the panel must use a fixed width
	 * instead of hugging its content.
	 */
	contentClass?: ClassValue;
	/**
	 * When true, blocks interaction with the rest of the page while open.
	 * Canvas menus set this to false.
	 * @defaultValue true
	 */
	modal?: boolean;
};

export type ContextMenuEmits<T extends ContextMenuId = ContextMenuId> = {
	(e: 'update:open', open: boolean): void;
	(e: 'update:selectedValues', value: T[]): void;
	(e: 'select', value: T): void;
	(e: 'submenu:toggle', itemId: T, open: boolean): void;
	(e: 'close-auto-focus', event: Event): void;
};

type SlotUiProps = { class: string };

export type ContextMenuSlots<T extends ContextMenuId = ContextMenuId> = {
	trigger: () => void;
	item?: (props: { item: ContextMenuLeaf<T> }) => void;
	['item-leading']?: (props: { item: ContextMenuLeaf<T>; ui: SlotUiProps }) => void;
	['item-label']?: (props: { item: ContextMenuLeaf<T>; ui: SlotUiProps }) => void;
	['item-trailing']?: (props: { item: ContextMenuLeaf<T>; ui: SlotUiProps }) => void;
	loading?: () => void;
	empty?: () => void;
};

export type ContextMenuItemProps<T extends ContextMenuId = ContextMenuId> = {
	item: ContextMenuLeaf<T>;
};

export type ContextMenuItemEmits<T extends ContextMenuId = ContextMenuId> = {
	(e: 'select', value: T): void;
	(e: 'toggle-checkbox', id: T): void;
	(e: 'submenu:toggle', open: boolean): void;
};

export type ContextMenuItemSlots<T extends ContextMenuId = ContextMenuId> = Pick<
	ContextMenuSlots<T>,
	'item' | 'item-leading' | 'item-label' | 'item-trailing' | 'empty'
>;

export type ContextMenuState = {
	selectedValues: Pick<ComputedRef<readonly string[]>, 'value'>;
	contentClass: Pick<ComputedRef<ClassValue | undefined>, 'value'>;
	onSelect(id: string, keepOpen?: boolean): void;
	onToggleCheckbox(id: string): void;
	onSelectRadio(groupId: string, radioId: string): void;
	onSubmenuToggle(itemId: string, open: boolean): void;
};

export const contextMenuStateKey: InjectionKey<ContextMenuState> = Symbol('N8nContextMenuState');
