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
	/**
	 * Feature id from the list the app provides.
	 * The entry decides which badges render beside the label.
	 */
	feature?: string;
}
