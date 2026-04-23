import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'encryption-key-manager', instanceTypes: ['main'] })
export class EncryptionKeyManagerModule implements ModuleInterface {
	async init() {
		await import('./key-manager.service');

		const { EncryptionBootstrapService } = await import('./encryption-bootstrap.service');
		await Container.get(EncryptionBootstrapService).run();
	}
}
