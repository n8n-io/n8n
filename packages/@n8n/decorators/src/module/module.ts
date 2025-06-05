import { Container, Service, type Constructable } from '@n8n/di';

import { ModuleMetadata } from './module-metadata';

export interface BaseN8nModule {
	initialize?(): void | Promise<void>;
}

export type Module = Constructable<BaseN8nModule>;

export const N8nModule = (): ClassDecorator => (target) => {
	Container.get(ModuleMetadata).register(target as unknown as Module);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Service()(target);
};
