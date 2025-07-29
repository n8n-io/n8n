import type { TabOptions } from '@n8n/design-system';
import type { DynamicTabOptions } from '@/components/Projects/ProjectTabs.vue';
import { useUIStore } from '@/stores/ui.store';
import { useI18n } from '@n8n/i18n';

export interface TabConfig {
	labelKey: string;
	routeName: string;
	includeProjectId?: boolean;
}

export interface ModuleTabsConfig {
	overview?: TabConfig;
	project?: TabConfig;
	shared?: TabConfig;
}

/**
 * Helper to register module tabs with reduced boilerplate
 *
 * @param moduleName - The module name for registration
 * @param config - Configuration for different page types
 */
export function createModuleTabs(moduleName: string, config: ModuleTabsConfig): void {
	const uiStore = useUIStore();
	const i18n = useI18n();

	Object.entries(config).forEach(([pageType, tabConfig]) => {
		if (!tabConfig) return;

		const tab: TabOptions<string> | DynamicTabOptions = {
			label: i18n.baseText(tabConfig.labelKey),
			value: tabConfig.routeName,
			to: {
				name: tabConfig.routeName,
			},
		};

		// Add dynamic route handling for project tabs
		if (pageType === 'project' && tabConfig.includeProjectId) {
			(tab as DynamicTabOptions).dynamicRoute = {
				name: tabConfig.routeName,
				includeProjectId: true,
			};
		}

		uiStore.registerCustomTabs(pageType as 'overview' | 'project' | 'shared', moduleName, [tab]);
	});
}
