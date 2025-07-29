import type { RouteLocationNormalized } from 'vue-router';
import { useSettingsStore } from '@/stores/settings.store';

/**
 * Check if a module is available based on route metadata
 * Can be used as a route middleware or guard
 */
export function checkModuleAvailability(to?: RouteLocationNormalized): boolean {
	if (!to?.meta?.moduleName || typeof to.meta.moduleName !== 'string') {
		return true;
	}
	return useSettingsStore().isModuleActive(to.meta.moduleName);
}

/**
 * Create a standardized middleware options object for module routes
 */
export function createModuleMiddleware(moduleName: string) {
	return {
		middleware: ['authenticated', 'custom'],
		middlewareOptions: {
			custom: (options: { to?: RouteLocationNormalized }) => checkModuleAvailability(options?.to),
		},
	};
}
