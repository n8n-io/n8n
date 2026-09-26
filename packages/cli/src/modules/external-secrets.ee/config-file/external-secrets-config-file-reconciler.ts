import type { SecretsProviderConnection } from '@n8n/db';
import { DbLock, DbLockService, SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { SecretsProvidersConnectionsService } from '../secrets-providers-connections.service.ee';

import type { LoadedExternalSecretsConnection } from './external-secrets-config-file-loader';

@Service()
export class ExternalSecretsConfigFileReconciler {
	constructor(
		private readonly repository: SecretsProviderConnectionRepository,
		private readonly connectionsService: SecretsProvidersConnectionsService,
		private readonly dbLockService: DbLockService,
	) {}

	/**
	 * Every main instance calls this at boot. The advisory lock serializes the instances: the
	 * first one applies the file, and the others find nothing left to change.
	 *
	 * Encryption and decryption run before the lock, and provider syncs run after it. The lock
	 * transaction holds a DB connection, so it must not wait on a key lookup or on a network
	 * call to a secrets backend.
	 */
	async reconcile(connections: LoadedExternalSecretsConnection[]): Promise<void> {
		const desiredByKey = new Map(connections.map((c) => [c.key, c]));

		const encryptedByKey = new Map<string, string>();
		for (const desired of connections) {
			encryptedByKey.set(
				desired.key,
				await this.connectionsService.encryptConfigFileSettings(desired.settings),
			);
		}

		// Stored ciphertexts that already decrypt to the desired settings. A row that another
		// instance rewrites after this snapshot has a new ciphertext, so it is updated again.
		const unchangedCiphertexts = new Set<string>();
		for (const existing of await this.repository.findByManagedBy('config-file')) {
			const desired = desiredByKey.get(existing.providerKey);
			if (
				desired &&
				(await this.connectionsService.encryptedSettingsMatch(
					existing.encryptedSettings,
					desired.settings,
				))
			) {
				unchangedCiphertexts.add(existing.encryptedSettings);
			}
		}

		const changedKeys = await this.dbLockService.withLockContext(
			DbLock.EXTERNAL_SECRETS_CONFIG_RECONCILE,
			async (ctx) => {
				const changed: string[] = [];
				const existingByKey = new Map(
					(await this.repository.findByManagedBy('config-file', ctx)).map((c) => [
						c.providerKey,
						c,
					]),
				);

				for (const desired of connections) {
					const data = {
						type: desired.type,
						isEnabled: desired.isEnabled,
						projectIds: desired.projectIds,
						encryptedSettings: encryptedByKey.get(desired.key)!,
					};
					const existing = existingByKey.get(desired.key);

					if (!existing) {
						await this.connectionsService.createConfigFileConnection(desired.key, data, ctx);
						changed.push(desired.key);
						continue;
					}

					if (this.matchesDesiredState(existing, desired, unchangedCiphertexts)) continue;

					await this.connectionsService.updateConfigFileConnection(existing.id, data, ctx);
					changed.push(desired.key);
				}

				for (const existing of existingByKey.values()) {
					if (!desiredByKey.has(existing.providerKey)) {
						await this.connectionsService.deleteConfigFileConnection(existing.id, ctx);
						changed.push(existing.providerKey);
					}
				}

				return changed;
			},
		);

		await this.connectionsService.syncConfigFileConnections(changedKeys);
	}

	private matchesDesiredState(
		existing: SecretsProviderConnection,
		desired: LoadedExternalSecretsConnection,
		unchangedCiphertexts: Set<string>,
	): boolean {
		const existingProjectIds = new Set(existing.projectAccess.map((access) => access.projectId));
		const desiredProjectIds = new Set(desired.projectIds);

		return (
			existing.type === desired.type &&
			existing.isEnabled === desired.isEnabled &&
			unchangedCiphertexts.has(existing.encryptedSettings) &&
			existingProjectIds.size === desiredProjectIds.size &&
			[...desiredProjectIds].every((id) => existingProjectIds.has(id))
		);
	}
}
