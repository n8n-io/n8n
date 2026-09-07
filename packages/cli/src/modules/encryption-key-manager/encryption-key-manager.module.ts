import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'encryption-key-manager' })
export class EncryptionKeyManagerModule implements ModuleInterface {
	async init() {
		// Loading and seeding run on every instance, independent of the rotation
		// flag: the whole fleet must hold the keys before any instance turns the
		// flag on and starts using them.
		await import('./key-manager.service.js');
		const { isKeyRotationEnabled } = await import('./key-rotation-flag.js');

		// The management API (list + rotate) stays behind the flag: rotating keys
		// only makes sense once the rotation write path is enabled.
		if (isKeyRotationEnabled() && Container.get(InstanceSettings).instanceType === 'main') {
			await import('./encryption-key.controller.js');
		}

		const { EncryptionBootstrapService } = await import('./encryption-bootstrap.service.js');
		await Container.get(EncryptionBootstrapService).run();
	}

	/** Settings exposed to the frontend under `/rest/module-settings`. */
	async settings() {
		const { isKeyRotationEnabled } = await import('./key-rotation-flag.js');
		return { rotationEnabled: isKeyRotationEnabled() };
	}
}
