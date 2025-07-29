import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { type Router } from 'vue-router';
import { insightsRoutes } from './insights/insights.router';
import { dataStoreRoutes } from './dataStore/dataStore.routes';
import { VIEWS } from '@/constants';
// import { initializeAllModules, getAllModuleRoutes } from '@/utils/module/registry';

/**
 * Once we have a mechanism to register and initialize modules generically,
 * we can remove this.
 * Each module should be responsible for its own initialization on demand.
 * This currently works that way for registering project tabs but routes
 * all still registered by explicitly importing the module routes here.
 *
 * NOTE: The new moduleRegistry provides a foundation for this, but we're keeping
 * the current approach for backward compatibility until all modules are migrated.
 */

/**
 * Initialize modules stores, done in init.ts
 */
export const initializeModuleStores = () => {
	// Current approach - individual initialization
	useDataStoreStore().initialize();

	// Future approach - registry-based initialization
	// initializeAllModules();
};

/**
 * Initialize module routes, done in main.ts
 */
export const registerModuleRoutes = (router: Router) => {
	// Init insights module routes
	insightsRoutes.forEach((route) => {
		router.addRoute(route);
	});

	// Register data store routes
	dataStoreRoutes.forEach((route) => {
		// Add project-specific routes under main project route
		if (route.meta?.projectRoute) {
			router.addRoute(VIEWS.PROJECT_DETAILS, route);
		} else {
			router.addRoute(route);
		}
	});

	// Future approach - registry-based route registration
	// getAllModuleRoutes().forEach((route) => {
	//   if (route.meta?.projectRoute) {
	//     router.addRoute(VIEWS.PROJECT_DETAILS, route);
	//   } else {
	//     router.addRoute(route);
	//   }
	// });
};
