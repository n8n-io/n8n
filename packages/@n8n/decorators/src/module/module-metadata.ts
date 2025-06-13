import { Service } from '@n8n/di';

import type { ModuleClass } from './module';

@Service()
export class ModuleMetadata {
	private readonly modules: Set<ModuleClass> = new Set();

	register(module: ModuleClass) {
		this.modules.add(module);
	}

	getModules() {
		return this.modules.keys();
	}
}
