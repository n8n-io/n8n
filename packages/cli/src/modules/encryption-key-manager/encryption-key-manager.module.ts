import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isKeyRotationApiEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION === 'true';
}

@BackendModule({ name: 'encryption-key-manager', instanceTypes: ['main'] })
export class EncryptionKeyManagerModule implements ModuleInterface {
	async init() {
		if (isKeyRotationApiEnabled()) {
			await import('./key-manager.service');
			await import('./encryption-key.controller');
			const { EncryptionBootstrapService } = await import('./encryption-bootstrap.service');
			await Container.get(EncryptionBootstrapService).run();
		}
	}
}
