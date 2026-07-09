import type { RouteLocationRaw } from 'vue-router';
import type { TabOptions } from '@n8n/design-system';

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

export type ProcessedDynamicTab = TabOptions<string> & { insertAfter?: string };

/**
 * Process dynamic route configuration for tabs
 * Resolves dynamic routes with project IDs and other parameters
 */
export function processDynamicTab(tab: DynamicTabOptions, projectId?: string): ProcessedDynamicTab {
	if (!tab.dynamicRoute) {
		return tab;
	}

	const tabRoute: RouteLocationRaw = {
		name: tab.dynamicRoute.name,
	};

	if (tab.dynamicRoute.includeProjectId && projectId) {
		tabRoute.params = { projectId };
	}

	const { dynamicRoute, ...tabWithoutDynamic } = tab;
	return {
		...tabWithoutDynamic,
		to: tabRoute,
	};
}

/**
 * Process an array of tabs with dynamic route resolution
 */
export function processDynamicTabs(
	tabs: DynamicTabOptions[],
	projectId?: string,
): ProcessedDynamicTab[] {
	return tabs.map((tab) => processDynamicTab(tab, projectId));
}
