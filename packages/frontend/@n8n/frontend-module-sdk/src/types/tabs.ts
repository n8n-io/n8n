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
};
