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
	 *
	 * Every desired connection is resynced into THIS instance's own in-memory provider registry
	 * at the end, regardless of whether this instance's own diff found anything to write. This
	 * instance's registry was loaded during its own boot, which can race another instance's write
	 * under this same lock (multi-main): if this instance loses that race, its diff correctly
	 * finds nothing left to change, but its registry still reflects what it saw before the other
	 * instance's write landed. The only other way it would learn about that write is a
	 * cross-instance pub/sub broadcast, which can be missed while this instance is still wiring
	 * up its own subscriptions during boot. Resyncing unconditionally closes that gap without
	 * relying on broadcast delivery.
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

		const deletedKeys = await this.dbLockService.withLockContext(
			DbLock.EXTERNAL_SECRETS_CONFIG_RECONCILE,
			async (ctx) => {
				const deleted: string[] = [];
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
						configSourcedFields: desired.configSourcedFields,
					};
					const existing = existingByKey.get(desired.key);

					if (!existing) {
						await this.connectionsService.createConfigFileConnection(desired.key, data, ctx);
						continue;
					}

					if (this.matchesDesiredState(existing, desired, unchangedCiphertexts)) continue;

					await this.connectionsService.updateConfigFileConnection(existing.id, data, ctx);
				}

				for (const existing of existingByKey.values()) {
					if (!desiredByKey.has(existing.providerKey)) {
						await this.connectionsService.deleteConfigFileConnection(existing.id, ctx);
						deleted.push(existing.providerKey);
					}
				}

				return deleted;
			},
		);

		// Every desired key is resynced, not only the ones this instance's own diff changed — see
		// the multi-main race explained on `reconcile`'s doc comment above. Deleted keys still
		// need their own sync call (`syncProviderConnection` also handles removal when the row is
		// gone), so they're included alongside every currently-desired key.
		await this.connectionsService.syncConfigFileConnections([
			...connections.map((c) => c.key),
			...deletedKeys,
		]);
	}

	private matchesDesiredState(
		existing: SecretsProviderConnection,
		desired: LoadedExternalSecretsConnection,
		unchangedCiphertexts: Set<string>,
	): boolean {
		const existingProjectIds = new Set(existing.projectAccess.map((access) => access.projectId));
		const desiredProjectIds = new Set(desired.projectIds);

		const existingConfigSourcedFields = new Set(existing.configSourcedFields ?? []);
		const desiredConfigSourcedFields = new Set(desired.configSourcedFields);

		return (
			existing.type === desired.type &&
			existing.isEnabled === desired.isEnabled &&
			unchangedCiphertexts.has(existing.encryptedSettings) &&
			existingProjectIds.size === desiredProjectIds.size &&
			[...desiredProjectIds].every((id) => existingProjectIds.has(id)) &&
			existingConfigSourcedFields.size === desiredConfigSourcedFields.size &&
			[...desiredConfigSourcedFields].every((field) => existingConfigSourcedFields.has(field))
		);
	}
}
