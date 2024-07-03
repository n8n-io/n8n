import type { KeyboardShortcut } from 'n8n-design-system/types/keyboardshortcut';

export interface ActionDropdownItem {
	id: string;
	label: string;
	icon?: string;
	divided?: boolean;
	disabled?: boolean;
	shortcut?: KeyboardShortcut;
	customClass?: string;
}
