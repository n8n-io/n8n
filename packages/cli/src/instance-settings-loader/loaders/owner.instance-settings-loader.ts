import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

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
		const { ownerOverride, ownerEmail, ownerPasswordHash } = this.instanceSettingsLoaderConfig;

		// No env vars provided at all — nothing to do
		if (!ownerOverride && !ownerEmail && !ownerPasswordHash) return 'skipped';

		// Env vars are provided (or override is on) — validate them
		if (!ownerEmail) {
			throw new OperationalError(
				'INSTANCE_OWNER_EMAIL is required when INSTANCE_OWNER_PASSWORD_HASH or INSTANCE_OWNER_OVERRIDE is set',
			);
		}

		if (!ownerPasswordHash) {
			throw new OperationalError(
				'INSTANCE_OWNER_PASSWORD_HASH is required when INSTANCE_OWNER_EMAIL or INSTANCE_OWNER_OVERRIDE is set',
			);
		}

		if (!BCRYPT_HASH_RE.test(ownerPasswordHash)) {
			throw new OperationalError(
				'INSTANCE_OWNER_PASSWORD_HASH is not a valid bcrypt hash. Provide a pre-hashed bcrypt string.',
			);
		}

		await this.ownershipService.setupOwner(
			{
				email: ownerEmail,
				firstName: this.instanceSettingsLoaderConfig.ownerFirstName,
				lastName: this.instanceSettingsLoaderConfig.ownerLastName,
				password: ownerPasswordHash,
			},
			{ overwriteExisting: ownerOverride, passwordIsHashed: true },
		);

		return 'created';
	}
}
