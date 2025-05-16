import { Service } from '@n8n/di';

import type { Module } from './module';

@Service()
export class ModuleMetadata {
	private readonly modules: Set<Module> = new Set();

	register(module: Module) {
		this.modules.add(module);
	}

	getModules() {
		return this.modules.keys();
	}
}
