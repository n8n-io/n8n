import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { ExternalSecretsConfigFileReconciler } from '@/modules/external-secrets.ee/config-file/external-secrets-config-file-reconciler';
import type { LoadedExternalSecretsConnection } from '@/modules/external-secrets.ee/config-file/external-secrets-config-file-loader';

import { setupTestServer } from '../shared/utils';

setupTestServer({
	endpointGroups: ['externalSecrets'],
	enabledFeatures: ['feat:externalSecrets'],
	modules: ['external-secrets'],
});

function connection(
	overrides: Partial<LoadedExternalSecretsConnection> = {},
): LoadedExternalSecretsConnection {
	return {
		key: 'reconcilerTest',
		type: 'vault',
		isEnabled: true,
		projectIds: [],
		settings: { url: 'https://vault.example.com' },
		...overrides,
	};
}

describe('ExternalSecretsConfigFileReconciler', () => {
	test('creates a connection that is in the file but not the DB', async () => {
		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);
		await reconciler.reconcile([connection({ key: 'reconcilerCreateTest' })]);

		const repository = Container.get(SecretsProviderConnectionRepository);
		const saved = await repository.findOne({ where: { providerKey: 'reconcilerCreateTest' } });

		expect(saved?.managedBy).toBe('config-file');
	});

	test('deletes a config-file-managed connection that is no longer in the file', async () => {
		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);
		await reconciler.reconcile([connection({ key: 'reconcilerDeleteTest' })]);
		await reconciler.reconcile([]);

		const repository = Container.get(SecretsProviderConnectionRepository);
		const stillThere = await repository.findOne({ where: { providerKey: 'reconcilerDeleteTest' } });

		expect(stillThere).toBeNull();
	});

	test('never touches an existing api-managed connection with a colliding key', async () => {
		const repository = Container.get(SecretsProviderConnectionRepository);
		await repository.save(
			repository.create({
				providerKey: 'reconcilerCollisionTest',
				type: 'vault',
				encryptedSettings: '{}',
				isEnabled: true,
				managedBy: 'api',
			}),
		);

		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);

		await expect(
			reconciler.reconcile([connection({ key: 'reconcilerCollisionTest' })]),
		).rejects.toThrow(/reconcilerCollisionTest/);

		const stillApiManaged = await repository.findOne({
			where: { providerKey: 'reconcilerCollisionTest' },
		});
		expect(stillApiManaged?.managedBy).toBe('api');
	});
});
