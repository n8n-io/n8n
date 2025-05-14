import { Service } from '@n8n/di';

import type { ModuleClass } from './module';
import { ModuleAlreadyRegisteredError } from './module-already-registered.error';

@Service()
export class ModuleMetadata {
	private readonly modules: Map<string, ModuleClass> = new Map();

	register(name: string, cls: ModuleClass) {
		if (this.modules.has(name)) throw new ModuleAlreadyRegisteredError(name, cls.name);

		this.modules.set(name, cls);
	}

	getModules() {
		return this.modules.entries();
	}

	clear(moduleName: string) {
		this.modules.delete(moduleName);
	}
}
