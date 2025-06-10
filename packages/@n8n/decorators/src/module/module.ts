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

export interface BaseN8nModule {
	init?(): void | Promise<void>;
	entities?(): EntityClass[];
}

export type Module = Constructable<BaseN8nModule>;

export const N8nModule = (): ClassDecorator => (target) => {
	Container.get(ModuleMetadata).register(target as unknown as Module);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Service()(target);
};
