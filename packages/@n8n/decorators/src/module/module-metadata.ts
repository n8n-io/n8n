import { Service } from '@n8n/di';

import type { ModuleClass } from './module';

type ModuleEntry = {
	class: ModuleClass;
};

@Service()
export class ModuleMetadata {
	private readonly modules: Map<string, ModuleEntry> = new Map();

	register(moduleName: string, moduleEntry: ModuleEntry) {
		this.modules.set(moduleName, moduleEntry);
	}

	get(moduleName: string) {
		return this.modules.get(moduleName);
	}

	getEntries() {
		return [...this.modules.entries()];
	}

	getClasses() {
		return [...this.modules.values()].map((entry) => entry.class);
	}
}
