import { Service } from '@n8n/di';

import type { ModuleClass } from './module';

@Service()
export class ModuleMetadata {
	private readonly modules: Map<string, ModuleClass> = new Map();

	register(moduleName: string, moduleClass: ModuleClass) {
		this.modules.set(moduleName, moduleClass);
	}

	getEntries() {
		return this.modules.entries();
	}

	getModules() {
		return this.modules.values();
	}
}
