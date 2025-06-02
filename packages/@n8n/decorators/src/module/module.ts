import { Container, Service, type Constructable } from '@n8n/di';
import type { BaseEntity } from '@n8n/typeorm';

import { ModuleMetadata } from './module-metadata';

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
