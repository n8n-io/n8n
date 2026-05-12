import { Container } from '@n8n/di';

import { InboundSecretsModule } from '../inbound-secrets.module';

describe('InboundSecretsModule', () => {
	let module: InboundSecretsModule;

	beforeEach(() => {
		Container.reset();
		module = new InboundSecretsModule();
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_INBOUND_SECRETS;
	});

	describe('init', () => {
		it('is a no-op when the feature flag is off', async () => {
			await expect(module.init()).resolves.toBeUndefined();
		});

		it('loads without error when the feature flag is on', async () => {
			process.env.N8N_ENV_FEAT_INBOUND_SECRETS = 'true';
			await expect(module.init()).resolves.toBeUndefined();
		});
	});
});
