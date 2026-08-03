import type { RouteLocationRaw } from 'vue-router';

/**
 * A tab a module contributes. Deliberately self-contained (a stable subset of
 * the design-system `TabOptions`) so the module contract does not couple to tab
 * rendering internals.
 *
 * `icon` is a plain `string` rather than the design-system `IconName` union —
 * see `ModuleSettingsPage` for the reasoning and the drift guard.
 */
export interface ModuleTabOptions<Value extends string | number> {
	value: Value;
	label?: string;
	icon?: string;
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

/**
 * A project/overview tab a module contributes. `dynamicRoute` is resolved with
 * the current project id at render time by the shell's `processDynamicTab`.
 */
export type DynamicTabOptions = ModuleTabOptions<string> & {
	dynamicRoute?: {
		name: string;
		includeProjectId?: boolean;
	};
	/**
	 * Insert this tab immediately after the tab whose `value` matches.
	 * If unset (or no match is found at render time), the tab is appended at the end.
	 */
	insertAfter?: string;
};
