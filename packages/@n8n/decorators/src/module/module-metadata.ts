import type { InstanceType } from '@n8n/constants';
import { Service } from '@n8n/di';

import type { LicenseFlag, ModuleClass } from './module';

/**
 * Internal representation of a registered module.
 * For field descriptions, see {@link BackendModuleOptions}.
 */
type ModuleEntry = {
	class: ModuleClass;
	licenseFlag?: LicenseFlag | LicenseFlag[];
	instanceTypes?: InstanceType[];
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
