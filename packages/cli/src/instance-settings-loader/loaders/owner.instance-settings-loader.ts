import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { OwnershipService } from '@/services/ownership.service';

/** Bcrypt hash format: $2b$NN$<53 base64 chars> (60 chars total) */
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

@Service()
export class OwnerInstanceSettingsLoader {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly ownershipService: OwnershipService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.instanceSettingsLoaderConfig.ownerOverride) return 'skipped';

		if (!this.instanceSettingsLoaderConfig.ownerEmail) {
			this.logger.warn(
				'Instance settings loader: owner loader skipped — INSTANCE_OWNER_EMAIL is required when INSTANCE_OWNER_OVERRIDE is true',
			);
			return 'skipped';
		}

		if (!this.instanceSettingsLoaderConfig.ownerPasswordHash) {
			this.logger.warn(
				'Instance settings loader: owner loader skipped — INSTANCE_OWNER_PASSWORD_HASH is required when INSTANCE_OWNER_OVERRIDE is true',
			);
			return 'skipped';
		}

		if (!BCRYPT_HASH_RE.test(this.instanceSettingsLoaderConfig.ownerPasswordHash)) {
			this.logger.warn(
				'Instance settings loader: owner loader skipped — INSTANCE_OWNER_PASSWORD_HASH is not a valid bcrypt hash',
			);
			return 'skipped';
		}

		await this.ownershipService.setupOwner(
			{
				email: this.instanceSettingsLoaderConfig.ownerEmail,
				firstName: this.instanceSettingsLoaderConfig.ownerFirstName,
				lastName: this.instanceSettingsLoaderConfig.ownerLastName,
				password: this.instanceSettingsLoaderConfig.ownerPasswordHash,
			},
			{ overwriteExisting: true, passwordIsHashed: true },
		);

		return 'created';
	}
}
