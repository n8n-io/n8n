import { Container } from '@n8n/di';

import { ModuleRegistry } from '@/modules/module-registry';
import type { ModuleName } from '@/modules/modules.config';

export async function loadModules(moduleNames: ModuleName[]) {
	await Container.get(ModuleRegistry).loadModules(moduleNames);
}
