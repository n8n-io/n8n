import { Service } from '@n8n/di';

import { ContextEstablishmentHookClass } from './context-establishment-hook';

type ContextEstablishmentHookEntry = {
	class: ContextEstablishmentHookClass;
};

@Service()
export class ContextEstablishmentHookMetadata {
	private readonly modules: Map<string, ContextEstablishmentHookEntry> = new Map();

	register(moduleName: string, moduleEntry: ContextEstablishmentHookEntry) {
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
