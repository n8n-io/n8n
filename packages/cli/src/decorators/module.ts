import { Container, Service, type Constructable } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';

export interface BaseN8nModule {
	registerLifecycleHooks?(hooks: ExecutionLifecycleHooks): void;
}

type Module = Constructable<BaseN8nModule>;

export const registry = new Set<Module>();

export const N8nModule = (): ClassDecorator => (target) => {
	registry.add(target as unknown as Module);

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return Service()(target);
};

@Service()
export class ModuleRegistry {
	registerLifecycleHooks(hooks: ExecutionLifecycleHooks) {
		for (const ModuleClass of registry.keys()) {
			const instance = Container.get(ModuleClass);
			if (instance.registerLifecycleHooks) {
				instance.registerLifecycleHooks(hooks);
			}
		}
	}
}
