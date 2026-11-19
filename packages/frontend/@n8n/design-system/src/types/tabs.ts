import type { RouteLocationRaw } from 'vue-router';

import type { IconColor } from './icon';
import type { IconName } from '../components/N8nIcon/icons';

export interface TabOptions<Value extends string | number> {
	value: Value;
	label: string;
	icon?: IconName | (string & {});
	iconPosition?: 'left' | 'right';
	/** Colors only the icon, for example `danger` to flag a problem. */
	iconColor?: IconColor;
	/** Prevents selecting the tab (greyed out); combine with `tooltip` to explain why. */
	disabled?: boolean;
	tooltip?: string;
	align?: 'left' | 'right';
	to?: RouteLocationRaw;
	notification?: boolean;
	tag?: string;
	preview?: boolean;
}
