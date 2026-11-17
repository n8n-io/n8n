import type { RouteLocationRaw } from 'vue-router';

import type { IconName } from '../components/N8nIcon/icons';

export interface TabOptions<Value extends string | number> {
	value: Value;
	label?: string;
	icon?: IconName | (string & {});
	iconPosition?: 'left' | 'right';
	variant?: 'default' | 'danger';
	href?: string;
	/** Prevents selecting the tab (greyed out); combine with `tooltip` to explain why. */
	disabled?: boolean;
	tooltip?: string;
	align?: 'left' | 'right';
	to?: RouteLocationRaw;
	notification?: boolean;
	tag?: string;
	preview?: boolean;
	/**
	 * Shows a close button after the tab, and the tab emits `close` for it. The
	 * Delete key on the tab does the same. Only plain tabs, not `href` or `to` tabs.
	 */
	closable?: boolean;
	/** The accessible name of the close button, such as "Remove Stats". */
	closeLabel?: string;
}
