import { createTeamProject } from '@n8n/backend-test-utils';
import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher } from 'n8n-core';

import { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';

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
		configSourcedFields: [],
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

	test('does not rewrite the DB row when the file is unchanged, but still resyncs the registry', async () => {
		const project = await createTeamProject('Unchanged Reconcile Project');
		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);
		const repository = Container.get(SecretsProviderConnectionRepository);
		const desired = connection({ key: 'reconcilerNoopTest', projectIds: [project.id] });

		await reconciler.reconcile([desired]);
		const first = await repository.findOneOrFail({ where: { providerKey: 'reconcilerNoopTest' } });

		const sync = vi.spyOn(Container.get(ExternalSecretsManager), 'syncProviderConnection');
		await reconciler.reconcile([{ ...desired, projectIds: [project.id] }]);
		const second = await repository.findOneOrFail({ where: { providerKey: 'reconcilerNoopTest' } });

		// No DB write for the unchanged row — the whole point of the "unchanged" optimization.
		expect(second.updatedAt).toEqual(first.updatedAt);
		expect(second.encryptedSettings).toBe(first.encryptedSettings);
		// But this instance's own in-memory registry is still resynced from the DB every
		// reconcile, regardless of whether THIS instance wrote anything — closing the multi-main
		// race where another instance's write (under the same advisory lock) is the one that
		// actually changed the row, and this instance's registry would otherwise never learn
		// about it except via a cross-instance pub/sub broadcast that might be missed during boot.
		expect(sync).toHaveBeenCalledWith('reconcilerNoopTest');
		sync.mockRestore();
	});

	test('resyncs every desired config-file connection even when nothing changed on this instance — closing the multi-main lock-loser race', async () => {
		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);
		const repository = Container.get(SecretsProviderConnectionRepository);

		// Simulate: another instance already wrote this row under the lock (e.g. it won the
		// race), so THIS instance's reconcile call finds nothing to change — matchesDesiredState
		// is already true on the very first call. Without a resync-regardless-of-changed-keys
		// fix, this instance's own manager registry (loaded moments earlier during its own boot,
		// before this reconcile ran) would never be told about a connection it never itself wrote.
		await repository.save(
			repository.create({
				providerKey: 'reconcilerLockLoserTest',
				type: 'vault',
				encryptedSettings: await Container.get(Cipher).encryptV2(
					JSON.stringify({ url: 'https://vault.example.com' }),
				),
				isEnabled: true,
				managedBy: 'config-file',
				configSourcedFields: [],
			}),
		);

		const sync = vi.spyOn(Container.get(ExternalSecretsManager), 'syncProviderConnection');
		await reconciler.reconcile([
			connection({
				key: 'reconcilerLockLoserTest',
				settings: { url: 'https://vault.example.com' },
			}),
		]);

		expect(sync).toHaveBeenCalledWith('reconcilerLockLoserTest');
		sync.mockRestore();
	});

	test('updates type, settings, and project access when the file entry changes', async () => {
		const [projectA, projectB] = await Promise.all([
			createTeamProject('Reconcile Project A'),
			createTeamProject('Reconcile Project B'),
		]);
		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);
		const repository = Container.get(SecretsProviderConnectionRepository);

		await reconciler.reconcile([
			connection({ key: 'reconcilerUpdateTest', projectIds: [projectA.id] }),
		]);

		await reconciler.reconcile([
			connection({
				key: 'reconcilerUpdateTest',
				type: 'awsSecretsManager',
				isEnabled: false,
				projectIds: [projectB.id],
				settings: { region: 'eu-west-1' },
			}),
		]);

		const updated = await repository.findOneOrFail({
			where: { providerKey: 'reconcilerUpdateTest' },
		});
		expect(updated.managedBy).toBe('config-file');
		expect(updated.type).toBe('awsSecretsManager');
		expect(updated.isEnabled).toBe(false);
		expect(updated.projectAccess.map((access) => access.projectId)).toEqual([projectB.id]);
		expect(updated.projectAccess[0].role).toBe('secretsProviderConnection:user');

		const decrypted = await Container.get(Cipher).decryptV2(updated.encryptedSettings);
		expect(JSON.parse(decrypted)).toEqual({ region: 'eu-west-1' });
	});

	test('persists which settings fields were config-sourced, for later redaction', async () => {
		const reconciler = Container.get(ExternalSecretsConfigFileReconciler);
		const repository = Container.get(SecretsProviderConnectionRepository);

		await reconciler.reconcile([
			connection({
				key: 'reconcilerProvenanceTest',
				settings: { url: 'https://vault.example.com', roleId: 'abc', secretId: 'resolved' },
				configSourcedFields: ['secretId'],
			}),
		]);

		const saved = await repository.findOneOrFail({
			where: { providerKey: 'reconcilerProvenanceTest' },
		});
		expect(saved.configSourcedFields).toEqual(['secretId']);
	});
});
