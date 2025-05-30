import { Container } from '@n8n/di';

import { ModuleRegistry } from '@/modules/module-registry';

export async function load(moduleNames: string[]) {
	for (const moduleName of moduleNames) {
		await import(`../../../src/modules/${moduleName}/${moduleName}.module`);
	}

	Container.get(ModuleRegistry).addEntities();
}
