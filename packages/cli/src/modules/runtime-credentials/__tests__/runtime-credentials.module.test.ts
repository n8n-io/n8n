import { Container } from '@n8n/di';

import { RuntimeCredentialsModule } from '../runtime-credentials.module';

describe('RuntimeCredentialsModule', () => {
	let module: RuntimeCredentialsModule;

	beforeEach(() => {
		Container.reset();
		module = new RuntimeCredentialsModule();
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS;
	});

	describe('init', () => {
		it('is a no-op when the feature flag is off', async () => {
			await expect(module.init()).resolves.toBeUndefined();
		});

		it('loads without error when the feature flag is on', async () => {
			process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
			await expect(module.init()).resolves.toBeUndefined();
		});
	});
});
