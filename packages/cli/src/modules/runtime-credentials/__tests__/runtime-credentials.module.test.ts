import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { RuntimeCredentialsService } from '../runtime-credentials.service';
import { RuntimeCredentialStubSeeder } from '../runtime-credential-stub.seeder';
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
			const seeder = mock<RuntimeCredentialStubSeeder>();
			Container.set(RuntimeCredentialStubSeeder, seeder);
			const rulesService = mock<RuntimeCredentialsService>();
			Container.set(RuntimeCredentialsService, rulesService);

			await expect(module.init()).resolves.toBeUndefined();
			expect(rulesService.loadDatabaseRules).toHaveBeenCalledTimes(1);
			expect(seeder.seed).toHaveBeenCalledTimes(1);
		});
	});
});
