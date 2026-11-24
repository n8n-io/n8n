import type { KeyboardShortcut } from './keyboardshortcut';
import type { IconName } from '../components/N8nIcon/icons';

export interface ActionDropdownItem<T extends string> {
	id: T;
	label: string;
	testId?: string;
	badge?: string;
	description?: string;
	badgeProps?: Record<string, unknown>;
	icon?: IconName;
	divided?: boolean;
	disabled?: boolean;
	/** Tooltip content for a trailing info icon, such as the reason an item is disabled. */
	tooltip?: string;
	shortcut?: KeyboardShortcut;
	customClass?: string;
	checked?: boolean;
	/** Destructive items (delete, revoke, ...) turn danger-red on hover. */
	variant?: 'default' | 'destructive';
	/** Nested items rendered as a sub-menu; selecting a child emits its own id. */
	children?: Array<ActionDropdownItem<T>>;
}
