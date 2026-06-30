import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { EgressPolicyService } from '@/egress/egress-policy.service';

/**
 * Seeds the egress protection policy in the settings table from the
 * `N8N_EGRESS_*` env vars.
 *
 * - When `N8N_EGRESS_PROTECTION_MANAGED_BY_ENV` is set, the env-derived policy
 *   overwrites the settings row on every startup and the admin UI is locked.
 * - Otherwise the env vars seed the policy only on first boot (when no row
 *   exists yet); after that the settings row, edited via the UI, is the source
 *   of truth.
 */
@Service()
export class EgressProtectionInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private readonly egressPolicyService: EgressPolicyService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		const managedByEnv = this.config.egressProtectionManagedByEnv;

		if (managedByEnv) {
			this.logger.info(
				'N8N_EGRESS_PROTECTION_MANAGED_BY_ENV is enabled — applying egress protection env vars',
			);
		}

		return await this.egressPolicyService.seedFromEnv({ force: managedByEnv });
	}
}
