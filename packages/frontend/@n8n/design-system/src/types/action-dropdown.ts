import type { KeyboardShortcut } from '@n8n/design-system/types/keyboardshortcut';

import type { IconName } from '../components/N8nIcon/icons';

export interface ActionDropdownItem<T extends string> {
	id: T;
	label: string;
	badge?: string;
	badgeProps?: Record<string, unknown>;
	icon?: IconName;
	divided?: boolean;
	disabled?: boolean;
	shortcut?: KeyboardShortcut;
	customClass?: string;
	checked?: boolean;
}
