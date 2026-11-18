import { SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

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
			Container.set(SettingsRepository, mock<SettingsRepository>({ findByKey: async () => null }));
			await expect(module.init()).resolves.toBeUndefined();
		});
	});

	describe('settings', () => {
		it('reports the feature as off when the flag is off', async () => {
			await expect(module.settings()).resolves.toEqual({ enabled: false, aliases: [] });
		});

		it('lists the aliases when the flag is on', async () => {
			process.env.N8N_ENV_FEAT_RUNTIME_CREDENTIALS = 'true';
			process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES =
				'{"env_key":{"nodeType":"*","path":"headers.authorization"}}';
			Container.set(SettingsRepository, mock<SettingsRepository>({ findByKey: async () => null }));
			await module.init();

			await expect(module.settings()).resolves.toEqual({ enabled: true, aliases: ['env_key'] });
			delete process.env.N8N_SECURITY_SENSITIVE_FIELD_RULES;
		});
	});
});
