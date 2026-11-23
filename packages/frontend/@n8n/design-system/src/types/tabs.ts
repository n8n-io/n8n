import type { RouteLocationRaw } from 'vue-router';

import type { IconColor, IconSize } from './icon';
import type { IconName } from '../components/N8nIcon/icons';

export interface TabOptions<Value extends string | number> {
	value: Value;
	label: string;
	icon?: IconName | (string & {});
	/**
	 * Side of the icon.
	 * @default 'left'
	 */
	iconPosition?: 'left' | 'right';
	/** Colors only the icon, for example `danger` to flag a problem. */
	iconColor?: IconColor;
	/**
	 * Size of the icon. Falls back to a size based on the tabs `size`.
	 */
	iconSize?: IconSize;
	/**
	 * Prevents selecting the tab (greyed out). Combine with `tooltip` to explain why.
	 * @default false
	 */
	disabled?: boolean;
	tooltip?: string;
	/**
	 * `'right'` groups the tab at the right end of the list.
	 * @default 'left'
	 */
	align?: 'left' | 'right';
	to?: RouteLocationRaw;
	/**
	 * Shows a notification dot.
	 * @default false
	 */
	notification?: boolean;
	tag?: string;
	/**
	 * Shows a preview badge after the label.
	 * @default false
	 */
	preview?: boolean;
}
