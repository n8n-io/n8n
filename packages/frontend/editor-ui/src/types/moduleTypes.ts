import type { RouteRecordRaw } from 'vue-router';
import type { ResourceMetadata } from '@/features/resourceRegistry';
import type { ModuleTabsConfig } from '@/utils/moduleTabHelper';

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
 * Module registry for centralized module management
 */
class ModuleRegistry {
	private modules: Map<string, ModuleInitializer> = new Map();

	/**
	 * Register a module
	 */
	register(module: ModuleInitializer): void {
		if (this.modules.has(module.moduleName)) {
			console.warn(`Module '${module.moduleName}' is already registered`);
			return;
		}
		this.modules.set(module.moduleName, module);
	}

	/**
	 * Get a registered module
	 */
	get(moduleName: string): ModuleInitializer | undefined {
		return this.modules.get(moduleName);
	}

	/**
	 * Get all registered modules
	 */
	getAll(): ModuleInitializer[] {
		return Array.from(this.modules.values());
	}

	/**
	 * Initialize all registered modules
	 */
	initializeAll(): void {
		this.modules.forEach((module) => {
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
	getAllRoutes(): RouteRecordRaw[] {
		return this.getAll()
			.filter((module) => module.routes)
			.flatMap((module) => module.routes!);
	}
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();

/**
 * Helper function to register a module
 */
export function registerModule(module: ModuleInitializer): void {
	moduleRegistry.register(module);
}
