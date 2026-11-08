import type { TabOptions } from '@n8n/design-system';

/**
 * A project/overview tab a module contributes. `dynamicRoute` is resolved with
 * the current project id at render time by the shell's `processDynamicTab`.
 */
export type DynamicTabOptions = TabOptions<string> & {
	dynamicRoute?: {
		name: string;
		includeProjectId?: boolean;
	};
	/**
	 * Insert this tab immediately after the tab whose `value` matches.
	 * If unset (or no match is found at render time), the tab is appended at the end.
	 */
	insertAfter?: string;
	/**
	 * Hide the tab when this returns `false`. Receives the current project id, or `undefined`
	 * on the overview and shared pages. Called inside a `computed`, so reactive reads update the tab.
	 */
	available?: (projectId: string | undefined) => boolean;
};
