import type { RouteLocationRaw } from 'vue-router';

export interface TabOptions<Value extends string | number> {
	value: Value;
	label?: string;
	icon?: string;
	href?: string;
	tooltip?: string;
	align?: 'left' | 'right';
	to?: RouteLocationRaw;
}
