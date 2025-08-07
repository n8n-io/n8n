import { ModuleRegistry } from '@n8n/backend-common';
import type { ModuleName } from '@n8n/backend-common';
import { Container } from '@n8n/di';

export async function loadModules(moduleNames: ModuleName[]) {
	await Container.get(ModuleRegistry).loadModules(moduleNames);
}
