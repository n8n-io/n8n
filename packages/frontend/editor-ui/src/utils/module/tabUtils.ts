import type { RouteLocationRaw } from 'vue-router';
import type { TabOptions } from '@n8n/design-system';

export type DynamicTabOptions = TabOptions<string> & {
	dynamicRoute?: {
		name: string;
		includeProjectId?: boolean;
	};
};

/**
 * Process dynamic route configuration for tabs
 * Resolves dynamic routes with project IDs and other parameters
 */
export function processDynamicTab(tab: DynamicTabOptions, projectId?: string): TabOptions<string> {
	if (!tab.dynamicRoute) {
		return tab;
	}

	const tabRoute: RouteLocationRaw = {
		name: tab.dynamicRoute.name,
	};

	if (tab.dynamicRoute.includeProjectId && projectId) {
		tabRoute.params = { projectId };
	}

	return {
		...tab,
		to: tabRoute,
		// Remove the dynamic route config after processing
		dynamicRoute: undefined,
	};
}

/**
 * Process an array of tabs with dynamic route resolution
 */
export function processDynamicTabs(
	tabs: DynamicTabOptions[],
	projectId?: string,
): TabOptions<string>[] {
	return tabs.map((tab) => processDynamicTab(tab, projectId));
}
