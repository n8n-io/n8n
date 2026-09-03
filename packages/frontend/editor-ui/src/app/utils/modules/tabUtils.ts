import type { DynamicTabOptions } from '@n8n/frontend-module-sdk';
import type { RouteLocationRaw } from 'vue-router';
import type { TabOptions } from '@n8n/design-system';
import { resolveContributionLabel } from './labelUtils';

export type ProcessedDynamicTab = TabOptions<string> & { insertAfter?: string };

/**
 * Process dynamic route configuration for tabs
 * Resolves dynamic routes with project IDs and other parameters, and translates a
 * declared `labelKey`. Call this from inside the computed that renders the tabs, so
 * the label follows a locale change.
 */
export function processDynamicTab(tab: DynamicTabOptions, projectId?: string): ProcessedDynamicTab {
	const { dynamicRoute, labelKey, ...rest } = tab;
	const label = resolveContributionLabel(tab);
	const processed: ProcessedDynamicTab = label === undefined ? rest : { ...rest, label };

	if (!dynamicRoute) {
		return processed;
	}

	const tabRoute: RouteLocationRaw = {
		name: dynamicRoute.name,
	};

	if (dynamicRoute.includeProjectId && projectId) {
		tabRoute.params = { projectId };
	}

	return {
		...processed,
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
