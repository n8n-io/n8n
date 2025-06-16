import { LicenseState } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import { ModuleRegistry } from '@/modules/module-registry';

export async function load(moduleNames: string[]) {
	Container.set(LicenseState, mock<LicenseState>());

	for (const moduleName of moduleNames) {
		try {
			await import(`../../../src/modules/${moduleName}/${moduleName}.module`);
		} catch {
			await import(`../../../src/modules/${moduleName}.ee/${moduleName}.module`);
		}
	}

	Container.get(ModuleRegistry).addEntities();
}
