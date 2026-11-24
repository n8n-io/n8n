import type { Component } from 'vue';

import type { KeyboardShortcut } from '../../types/keyboardshortcut';
import type { IconOrEmoji } from '../N8nIconPicker/types';

export interface CommandBarItemComponent {
	component: Component;
	props?: Record<string, unknown>;
}

export type CommandBarItemIcon = IconOrEmoji | CommandBarItemComponent;

export interface CommandBarItem {
	id: string;
	title: string;
	description?: string;
	descriptionIcon?: IconOrEmoji;
	icon?: CommandBarItemIcon;
	section?: string;
	keywords?: string[];
	shortcut?: KeyboardShortcut;
	timestamp?: string;
	href?: string;
	disabled?: boolean;
	/**
	 * Rendered at the end of the row in place of the lock of a disabled item.
	 * It also receives `rowElement` and `isActive` (selected by the user, not by default).
	 * When it exposes `activate()`, Enter on its disabled, active row calls it,
	 * because the focus stays in the search input.
	 */
	trailing?: CommandBarItemComponent;
	placeholder?: string;
	children?: CommandBarItem[];
	handler?: () => void | Promise<void>;
}

export interface CommandBarSection {
	id: string;
	title?: string;
	items: CommandBarItem[];
	isLoading?: boolean;
}

export interface CommandBarTab {
	id: string;
	label: string;
}

export interface CommandBarSelectOptions {
	newTab: boolean;
}
