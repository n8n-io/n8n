import { Service } from '@n8n/di';

import type { LicenseFlag, ModuleClass } from './module';

type ModuleEntry = {
	class: ModuleClass;
	/*
	 * If singular, checks if that feature ls licensed,
	 * if multiple, checks that any of the features are licensed
	 */
	licenseFlag?: LicenseFlag | LicenseFlag[];
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
