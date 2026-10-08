import type { FrontendModuleSettings } from '@n8n/api-types';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { EncryptionKeyManagerModule } from '@/modules/encryption-key-manager/encryption-key-manager.module';

// Compile-time pin: the settings this module returns are read by the frontend
// under this exact key, so the decorator name must stay a member of
// `FrontendModuleSettings`.
const MODULE_NAME = 'encryption-key-manager' satisfies keyof FrontendModuleSettings;

describe('EncryptionKeyManagerModule', () => {
	beforeEach(() => {
		// Must not depend on the ambient environment of the developer machine.
		delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION;
	});

	describe('settings()', () => {
		it('reports rotation as disabled by default', async () => {
			const settings = await new EncryptionKeyManagerModule().settings();

			expect(settings).toEqual({ rotationEnabled: false });
		});

		it('reports rotation as enabled when the flag is set', async () => {
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION = 'true';

			const settings = await new EncryptionKeyManagerModule().settings();

			expect(settings).toEqual({ rotationEnabled: true });
		});
	});

	it('is registered under the module-settings key the frontend reads', () => {
		expect(Container.get(ModuleMetadata).get(MODULE_NAME)?.class).toBe(EncryptionKeyManagerModule);
	});
});
