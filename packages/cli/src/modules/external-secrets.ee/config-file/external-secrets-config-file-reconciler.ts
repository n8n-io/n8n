import { SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { SecretsProvidersConnectionsService } from '../secrets-providers-connections.service.ee';

import type { LoadedExternalSecretsConnection } from './external-secrets-config-file-loader';

@Service()
export class ExternalSecretsConfigFileReconciler {
	constructor(
		private readonly repository: SecretsProviderConnectionRepository,
		private readonly connectionsService: SecretsProvidersConnectionsService,
	) {}

	async reconcile(connections: LoadedExternalSecretsConnection[]): Promise<void> {
		const existingConfigFileManaged = await this.repository.findByManagedBy('config-file');
		const existingByKey = new Map(existingConfigFileManaged.map((c) => [c.providerKey, c]));
		const desiredByKey = new Map(connections.map((c) => [c.key, c]));

		for (const desired of connections) {
			const existing = existingByKey.get(desired.key);

			if (!existing) {
				await this.connectionsService.createConfigFileConnection({
					providerKey: desired.key,
					type: desired.type,
					isEnabled: desired.isEnabled,
					projectIds: desired.projectIds,
					settings: desired.settings,
				});
				continue;
			}

			await this.connectionsService.updateConfigFileConnection(desired.key, {
				type: desired.type,
				isEnabled: desired.isEnabled,
				projectIds: desired.projectIds,
				settings: desired.settings,
			});
		}

		for (const existing of existingConfigFileManaged) {
			if (!desiredByKey.has(existing.providerKey)) {
				await this.connectionsService.deleteConfigFileConnection(existing.providerKey);
			}
		}
	}
}
