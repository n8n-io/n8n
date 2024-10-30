import type { KeyboardShortcut } from 'n8n-design-system/types/keyboardshortcut';

export interface SplitDropdownButtonItem {
	id: string;
	label: string;
	badge?: string;
	badgeProps?: Record<string, unknown>;
	icon?: string;
	divided?: boolean;
	disabled?: boolean;
	shortcut?: KeyboardShortcut;
	customClass?: string;
}
