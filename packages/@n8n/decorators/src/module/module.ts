import { Container, Service, type Constructable } from '@n8n/di';

import { ModuleMetadata } from './module-metadata';

/**
 * Structurally similar (not identical) interface to typeorm's `BaseEntity`
 * to prevent importing `@n8n/typeorm` into `@n8n/decorators`.
 */
export interface BaseEntity {
	hasId(): boolean;
	save(options?: unknown): Promise<this>;
	remove(options?: unknown): Promise<this>;
	softRemove(options?: unknown): Promise<this>;
	recover(options?: unknown): Promise<this>;
	reload(): Promise<void>;
}

export type EntityClass = new () => BaseEntity;

export interface ModuleInterface {
	init?(): void | Promise<void>;
	entities?(): EntityClass[];
}

export type ModuleClass = Constructable<ModuleInterface>;

export const BackendModule = (): ClassDecorator => (target) => {
	Container.get(ModuleMetadata).register(target as unknown as ModuleClass);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Service()(target);
};
