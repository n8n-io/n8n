import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({ name: 'encryption-key-manager' })
export class EncryptionKeyManagerModule implements ModuleInterface {
	async init() {
		// Key seeding and provider wiring run early in BaseCommand for every
		// entrypoint (including one-off commands), so the module only registers
		// the management API. The API (list + rotate) stays behind the flag:
		// rotating keys only makes sense once the rotation write path is enabled.
		const { isKeyRotationEnabled } = await import('@/encryption/key-rotation-flag.js');

		if (isKeyRotationEnabled() && Container.get(InstanceSettings).instanceType === 'main') {
			await import('./encryption-key.controller.js');
		}
	}

	/** Settings exposed to the frontend under `/rest/module-settings`. */
	async settings() {
		const { isKeyRotationEnabled } = await import('@/encryption/key-rotation-flag.js');
		return { rotationEnabled: isKeyRotationEnabled() };
	}
}
