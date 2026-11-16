import type { IconName } from '@n8n/design-system';
import type { IRunDataDisplayMode } from '@/Interface';

// `satisfies` makes a new built-in mode without an icon a type error
const DISPLAY_MODE_ICONS = new Map<string, IconName>(
	Object.entries({
		ai: 'text',
		html: 'file-code',
		schema: 'schema',
		table: 'table',
		json: 'json',
		binary: 'binary',
	} satisfies Record<IRunDataDisplayMode, IconName>),
);

/** Returns the compact-mode icon of a display mode, or undefined to show its label instead */
export function iconFor(mode: string): IconName | undefined {
	return DISPLAY_MODE_ICONS.get(mode);
}
