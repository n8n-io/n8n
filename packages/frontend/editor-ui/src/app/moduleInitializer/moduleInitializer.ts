import { type RouteComponent, type Router, type RouteRecordRaw } from 'vue-router';
import {
	type FrontendModuleDescription,
	assertUniqueRouteNames,
	modalRegistry,
	registerResource,
	pushHandlerRegistry,
	commandRegistry,
	parameterInputRegistry,
} from '@n8n/frontend-module-sdk';
import { VIEWS } from '@/app/constants';
import { modules } from '@/app/modules.manifest';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { AGENTS_SETTINGS_VIEW } from '@/features/agents/constants';
import {
	INSTANCE_AI_NEW_VIEW,
	INSTANCE_AI_SETTINGS_VIEW,
} from '@/features/ai/instanceAi/constants';

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
			uiStore.registerSettingsPages(module.id, module.settingsPages, !!module.placeholderPage);
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
	const settingsStore = useSettingsStore();
	if (!settingsStore.isModuleActive(options.to.meta.moduleName)) {
		// A module with a placeholder page stays reachable
		return modules.some((m) => m.id === options.to.meta.moduleName && m.placeholderPage);
	}
	if (options.to.meta.moduleName === 'agents' && options.to.name !== AGENTS_SETTINGS_VIEW) {
		return settingsStore.isAgentsEnabled;
	}

	// When the admin toggle is off, instance-ai routes are disabled except the
	// settings route, and the template deep-link route, whose guard falls back
	// to the classic template setup instead of losing the user's intent.
	if (options.to.meta.moduleName === 'instance-ai') {
		const routeName = options.to.name;
		if (routeName !== INSTANCE_AI_SETTINGS_VIEW && routeName !== INSTANCE_AI_NEW_VIEW) {
			const enabled = settingsStore.moduleSettings['instance-ai']?.enabled;
			if (enabled === false) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Initialize module modals, done in init.ts
 */
export const registerModuleModals = () => {
	modules.forEach((module) => {
		module.modals?.forEach((modalDef) => {
			modalRegistry.register(modalDef);
		});
		module.adHocModalKeyPrefixes?.forEach((prefix) => {
			modalRegistry.declareAdHocKeyPrefix(prefix);
		});
	});
};

/**
 * Initialize module push handlers, done in init.ts. `useModulePushDispatcher`
 * dispatches to them at app scope.
 *
 * Only an active module registers: a claimed type also suppresses the shell's
 * built-in handler for it, so an inactive module would silently kill it.
 */
export const registerModulePushHandlers = () => {
	const settingsStore = useSettingsStore();
	modules.forEach((module) => {
		if (module.pushHandlers && settingsStore.isModuleActive(module.id)) {
			pushHandlerRegistry.registerAll(module.pushHandlers);
		}
	});
};

/**
 * Initialize module command-bar contributions, done in init.ts.
 */
export const registerModuleCommands = () => {
	modules.forEach((module) => {
		module.commands?.forEach((command) => {
			commandRegistry.register(command);
		});
	});
};

/**
 * Initialize module parameter inputs, done in init.ts. `ParameterInput` resolves
 * them by `parameter.type` at render time.
 *
 * Deliberately NOT gated on `isModuleActive`: a parameter input is a render
 * primitive, not a feature. A gated renderer leaves a parameter with nothing to
 * render it, which is a broken field rather than a hidden feature. Availability
 * is enforced backend-side.
 */
export const registerModuleParameterInputs = () => {
	modules.forEach((module) => {
		module.parameterInputs?.forEach((contribution) => {
			parameterInputRegistry.register(contribution);
		});
	});
};

// Module views are lazy loaders (see the frontend module guide)
const isLazyView = (
	component: RouteRecordRaw['component'],
): component is () => Promise<RouteComponent> => typeof component === 'function';

/**
 * Loads `placeholderPage` instead of the view while the module is inactive.
 * vue-router caches the first result, so the choice is made once per page load.
 */
const withPlaceholderPage = (
	route: RouteRecordRaw,
	module: FrontendModuleDescription,
): RouteRecordRaw => {
	const { placeholderPage } = module;
	if (!placeholderPage || !route.component || !isLazyView(route.component)) return route;
	const view = route.component;

	return {
		...route,
		component: async () =>
			useSettingsStore().isModuleActive(module.id) ? await view() : await placeholderPage(),
	};
};

/**
 * Initialize module routes, done in main.ts
 */
export const registerModuleRoutes = (router: Router) => {
	assertUniqueRouteNames(modules, router);

	modules.forEach((module) => {
		module.routes?.forEach((route) => {
			// Prepare the enhanced route with module metadata and custom middleware that checks module availability
			const enhancedRoute = {
				...withPlaceholderPage(route, module),
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
