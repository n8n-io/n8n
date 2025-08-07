import { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleName } from '@n8n/backend-common';
import { Container } from '@n8n/di';

// TEMPORARY: Extend ModuleName to include 'data-store' for tests
type TestModuleName = ModuleName | 'data-store';

export async function loadModules(moduleNames: TestModuleName[]) {
	await Container.get(ModuleRegistry).loadModules(moduleNames);
}
