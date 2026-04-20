import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'encryption-key-manager', instanceTypes: ['main'] })
export class EncryptionKeyManagerModule implements ModuleInterface {
	async init() {
		await import('./key-manager.service');
	}
}
