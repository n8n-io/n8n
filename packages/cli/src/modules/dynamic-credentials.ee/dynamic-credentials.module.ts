import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';

@BackendModule({ name: 'dynamic-credentials', licenseFlag: 'feat:externalSecrets' })
export class DynamicCredentialsModule implements ModuleInterface {
	async init() {
		await import('./context-establishment-hooks');
	}

	@OnShutdown()
	async shutdown() {}
}
