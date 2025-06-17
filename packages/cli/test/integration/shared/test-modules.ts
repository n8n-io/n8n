import { Container } from '@n8n/di';

import { ModuleRegistry } from '@/modules/module-registry';

export async function load(moduleNames: string[]) {
	for (const moduleName of moduleNames) {
		try {
			await import(`../../../src/modules/${moduleName}/${moduleName}.module`);
		} catch {
			await import(`../../../src/modules/${moduleName}.ee/${moduleName}.module`);
		}
	}

	Container.get(ModuleRegistry).addEntities();
}
