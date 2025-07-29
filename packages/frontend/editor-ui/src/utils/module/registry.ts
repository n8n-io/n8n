import type { RouteRecordRaw } from 'vue-router';
import type { ResourceMetadata } from '@/features/resourceRegistry';
import type { ModuleTabsConfig } from '@/utils/module/tabHelper';

/**
 * Standard interface for module initialization
 */
export interface ModuleInitializer {
	readonly moduleName: string;
	readonly routes?: RouteRecordRaw[];
	readonly resources?: ResourceMetadata[];
	readonly tabs?: ModuleTabsConfig;
	initialize(): void;
}

/**
 * Module registry for centralized module management (functional approach)
 */
const modules = new Map<string, ModuleInitializer>();

/**
 * Register a module
 */
export function registerModule(module: ModuleInitializer): void {
	if (modules.has(module.moduleName)) {
		console.warn(`Module '${module.moduleName}' is already registered`);
		return;
	}
	modules.set(module.moduleName, module);
}

/**
 * Get a registered module
 */
export function getModule(moduleName: string): ModuleInitializer | undefined {
	return modules.get(moduleName);
}

/**
 * Get all registered modules
 */
export function getAllModules(): ModuleInitializer[] {
	return Array.from(modules.values());
}

/**
 * Initialize all registered modules
 */
export function initializeAllModules(): void {
	modules.forEach((module) => {
		try {
			module.initialize();
		} catch (error) {
			console.error(`Failed to initialize module '${module.moduleName}':`, error);
		}
	});
}

/**
 * Get all routes from registered modules
 */
export function getAllModuleRoutes(): RouteRecordRaw[] {
	return getAllModules()
		.filter((module) => module.routes)
		.flatMap((module) => module.routes!);
}
