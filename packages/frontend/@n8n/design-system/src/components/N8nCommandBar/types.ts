import type { Component } from 'vue';

import type { KeyboardShortcut } from '../../types/keyboardshortcut';
import type { IconOrEmoji } from '../N8nIconPicker/types';

export type CommandBarItemIcon =
	| IconOrEmoji
	| { component: Component; props?: Record<string, unknown> };

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
