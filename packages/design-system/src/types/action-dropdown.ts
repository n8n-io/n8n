import type { KeyboardShortcut } from '@/types/keyboardshortcut';

export interface ActionDropdownItem {
	id: string;
	label: string;
	icon?: string;
	divided?: boolean;
	disabled?: boolean;
	shortcut?: KeyboardShortcut;
	customClass?: string;
}
