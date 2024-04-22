import type { KeyboardShortcut } from '@/types/keyboardshortcut';

export interface IActionDropdownItem {
	id: string;
	label: string;
	icon?: string;
	divided?: boolean;
	disabled?: boolean;
	shortcut?: KeyboardShortcut;
	customClass?: string;
}
