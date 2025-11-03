import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'provisioning' })
export class ProvisioningModule implements ModuleInterface {
	async init() {
		await import('./provisioning.controller.ee');
	}
}
