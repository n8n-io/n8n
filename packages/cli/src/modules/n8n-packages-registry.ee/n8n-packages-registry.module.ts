import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'n8n-packages-registry', instanceTypes: ['main'] })
export class N8nPackagesRegistryModule implements ModuleInterface {
	async init() {
		await import('./n8n-packages-registry.controller');
	}
}
