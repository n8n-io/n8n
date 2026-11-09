import type { DynamicTabOptions } from '@n8n/frontend-module-sdk';
import type { RouteLocationRaw } from 'vue-router';
import type { TabOptions } from '@n8n/design-system';

export type ProcessedDynamicTab = TabOptions<string> & { insertAfter?: string };

/**
 * Process dynamic route configuration for tabs
 * Resolves dynamic routes with project IDs and other parameters
 */
export function processDynamicTab(tab: DynamicTabOptions, projectId?: string): ProcessedDynamicTab {
	const { available: _available, dynamicRoute, ...staticTab } = tab;
	if (!dynamicRoute) {
		return staticTab;
	}

	const tabRoute: RouteLocationRaw = {
		name: dynamicRoute.name,
	};

	if (dynamicRoute.includeProjectId && projectId) {
		tabRoute.params = { projectId };
	}

	return {
		...staticTab,
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
	return tabs
		.filter((tab) => tab.available?.(projectId) ?? true)
		.map((tab) => processDynamicTab(tab, projectId));
}
