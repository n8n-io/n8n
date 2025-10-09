import { type Router } from 'vue-router';
import { VIEWS } from '@/constants';
import { DataTableModule } from '@/features/dataTable/module.descriptor';
import { registerResource } from '@/moduleInitializer/resourceRegistry';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { InsightsModule } from '../features/insights/module.descriptor';
import { MCPModule } from '../features/mcpAccess/module.descriptor';
import { ChatModule } from '@/features/chatHub/module.descriptor';
import type { FrontendModuleDescription } from '@/moduleInitializer/module.types';
import * as modalRegistry from '@/moduleInitializer/modalRegistry';

/**
 * Hard-coding modules list until we have a dynamic way to load modules.
 */
const modules: FrontendModuleDescription[] = [
	InsightsModule,
	DataTableModule,
	MCPModule,
	ChatModule,
];

/**
 * Initialize modules resources (used in ResourcesListLayout), done in init.ts
 */
export const registerModuleResources = () => {
	modules.forEach((module) => {
		module.resources?.forEach((resource) => {
			registerResource(resource);
		});
	});
};

/**
 * Initialize modules project tabs (used in ProjectHeader), done in init.ts
 */
export const registerModuleProjectTabs = () => {
	const uiStore = useUIStore();
	modules.forEach((module) => {
		if (module.projectTabs) {
			if (module.projectTabs.overview) {
				uiStore.registerCustomTabs('overview', module.id, module.projectTabs.overview);
			}
			if (module.projectTabs.project) {
				uiStore.registerCustomTabs('project', module.id, module.projectTabs.project);
			}
			if (module.projectTabs.shared) {
				uiStore.registerCustomTabs('shared', module.id, module.projectTabs.shared);
			}
		}
	});
};

/**
 * Initialize modules settings sidebar items (used in SettingsSidebar), done in init.ts
 */
export const registerModuleSettingsPages = () => {
	const uiStore = useUIStore();
	modules.forEach((module) => {
		if (module.settingsPages && module.settingsPages.length > 0) {
			uiStore.registerSettingsPages(module.id, module.settingsPages);
		}
	});
};

/**
 * Middleware function to check if a module is available
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const checkModuleAvailability = (options: any) => {
	if (!options?.to?.meta?.moduleName || typeof options.to.meta.moduleName !== 'string') {
		return true;
	}
	return useSettingsStore().isModuleActive(options.to.meta.moduleName);
};

/**
 * Initialize module modals, done in init.ts
 */
export const registerModuleModals = () => {
	modules.forEach((module) => {
		module.modals?.forEach((modalDef) => {
			modalRegistry.register(modalDef);
		});
	});
	// Subscribe to modal registry changes
	useUIStore().initializeModalsFromRegistry();
};

/**
 * Initialize module routes, done in main.ts
 */
export const registerModuleRoutes = (router: Router) => {
	modules.forEach((module) => {
		module.routes?.forEach((route) => {
			// Prepare the enhanced route with module metadata and custom middleware that checks module availability
			const enhancedRoute = {
				...route,
				meta: {
					...route.meta,
					moduleName: module.id,
					// Merge middleware options if custom middleware is present
					...(route.meta?.middleware?.includes('custom') && {
						middlewareOptions: {
							...route.meta?.middlewareOptions,
							custom: checkModuleAvailability,
						},
					}),
				},
			};

			if (route.meta?.projectRoute) {
				router.addRoute(VIEWS.PROJECT_DETAILS, enhancedRoute);
			} else if (route.meta?.telemetry && route.meta.telemetry.pageCategory === 'settings') {
				router.addRoute(VIEWS.SETTINGS, enhancedRoute);
			} else {
				router.addRoute(enhancedRoute);
			}
		});
	});
};
