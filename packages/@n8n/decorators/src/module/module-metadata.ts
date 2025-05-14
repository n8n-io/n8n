import { Service } from '@n8n/di';

import type { ModuleClass } from './module';

@Service()
export class ModuleMetadata {
	private readonly modules: Map<string, ModuleClass> = new Map();

	register(name: string, cls: ModuleClass) {
		this.modules.set(name, cls);
	}

	getModuleClasses() {
		return this.modules.values();
	}

	getModules() {
		return this.modules.entries();
	}

	clear(moduleName: string) {
		this.modules.delete(moduleName);
	}
}
