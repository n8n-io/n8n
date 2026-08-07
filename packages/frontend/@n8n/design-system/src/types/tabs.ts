import type { RouteLocationRaw } from 'vue-router';

import type { IconName } from '../components/N8nIcon/icons';

export interface TabOptions<Value extends string | number> {
	value: Value;
	label?: string;
	/**
	 * `(string & {})` keeps autocomplete for known names while accepting one
	 * supplied by a caller outside this package — same widening `IMenuItem.icon`
	 * already uses. An unknown name degrades at render time.
	 */
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
}
