import { Container, Service, type Constructable } from '@n8n/di';

import { ModuleMetadata } from './module-metadata';

export interface ModuleInterface {
	init?(): void | Promise<void>;
}

export type ModuleClass = Constructable<ModuleInterface>;

/**
 * Decorator that registers in memory a module to be activated on startup.
 *
 * @example
 *
 * ```ts
 * @Module()
 * class FeatureModule extends ModuleInterface {
 *   async init() {
 *     // ...
 *   }
 * }
 * ```
 */
export const Module =
	(moduleName: string): ClassDecorator =>
	(moduleClass) => {
		Container.get(ModuleMetadata).register(moduleName, moduleClass as unknown as ModuleClass);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(moduleClass);
	};
