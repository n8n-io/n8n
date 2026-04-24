import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { EncryptionKeyProxy } from 'n8n-core';

function isKeyRotationApiEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION === 'true';
}

@BackendModule({ name: 'encryption-key-manager', instanceTypes: ['main'] })
export class EncryptionKeyManagerModule implements ModuleInterface {
	async init() {
		if (isKeyRotationApiEnabled()) {
			const { KeyManagerService } = await import('./key-manager.service');
			await import('./encryption-key.controller');
			const { EncryptionBootstrapService } = await import('./encryption-bootstrap.service');
			const keyManager = Container.get(KeyManagerService);
			Container.get(EncryptionKeyProxy).setProvider(keyManager);
			await Container.get(EncryptionBootstrapService).run();
		}
	}
}
