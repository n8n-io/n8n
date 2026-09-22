import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { setupTestServer } from '../shared/utils';

setupTestServer({
	endpointGroups: ['externalSecrets'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['external-secrets'],
});

describe('SecretsProviderConnection managedBy column', () => {
	test('defaults to "api" when not set', async () => {
		const repository = Container.get(SecretsProviderConnectionRepository);
		const connection = repository.create({
			providerKey: 'defaultManagedByTest',
			type: 'vault',
			encryptedSettings: '{}',
			isEnabled: true,
		});
		const saved = await repository.save(connection);

		expect(saved.managedBy).toBe('api');
	});

	test('persists "config-file" when explicitly set', async () => {
		const repository = Container.get(SecretsProviderConnectionRepository);
		const connection = repository.create({
			providerKey: 'configFileManagedTest',
			type: 'vault',
			encryptedSettings: '{}',
			isEnabled: true,
			managedBy: 'config-file',
		});
		const saved = await repository.save(connection);

		expect(saved.managedBy).toBe('config-file');
	});

	test('findByManagedBy returns only matching rows', async () => {
		const repository = Container.get(SecretsProviderConnectionRepository);
		await repository.save(
			repository.create({
				providerKey: 'findByManagedByApi',
				type: 'vault',
				encryptedSettings: '{}',
				isEnabled: true,
			}),
		);
		await repository.save(
			repository.create({
				providerKey: 'findByManagedByFile',
				type: 'vault',
				encryptedSettings: '{}',
				isEnabled: true,
				managedBy: 'config-file',
			}),
		);

		const configFileManaged = await repository.findByManagedBy('config-file');

		expect(configFileManaged.map((c) => c.providerKey)).toContain('findByManagedByFile');
		expect(configFileManaged.map((c) => c.providerKey)).not.toContain('findByManagedByApi');
	});
});
