import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { InstanceBootstrappingError } from '../instance-bootstrapping.error';

import { OwnershipService } from '@/services/ownership.service';

/** Bcrypt hash format: $2b$NN$<53 base64 chars> (60 chars total) */
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const ownerEnvSchema = z
	.object({
		ownerEmail: z
			.string()
			.min(
				1,
				'N8N_INSTANCE_OWNER_EMAIL is required when N8N_INSTANCE_OWNER_MANAGED_BY_ENV is true',
			),
		ownerPasswordHash: z
			.string()
			.min(
				1,
				'N8N_INSTANCE_OWNER_PASSWORD_HASH is required when N8N_INSTANCE_OWNER_MANAGED_BY_ENV is true',
			)
			.regex(
				BCRYPT_HASH_RE,
				'N8N_INSTANCE_OWNER_PASSWORD_HASH is not a valid bcrypt hash. Provide a pre-hashed bcrypt string.',
			),
		ownerFirstName: z.string(),
		ownerLastName: z.string(),
	})
	.transform(({ ownerEmail, ownerPasswordHash, ownerFirstName, ownerLastName }) => ({
		payload: {
			email: ownerEmail,
			firstName: ownerFirstName,
			lastName: ownerLastName,
			password: ownerPasswordHash,
		},
		options: { overwriteExisting: true, passwordIsHashed: true as const },
	}));

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
		const { ownerManagedByEnv } = this.instanceSettingsLoaderConfig;

		if (!ownerManagedByEnv) {
			this.logger.debug('Owner is not managed by environment variables, skipping');
			return 'skipped';
		}

		this.logger.info('N8N_INSTANCE_OWNER_MANAGED_BY_ENV is enabled — applying owner env vars');

		const result = ownerEnvSchema.safeParse(this.instanceSettingsLoaderConfig);

		if (!result.success) {
			throw new InstanceBootstrappingError(result.error.issues[0].message);
		}

		await this.ownershipService.setupOwner(result.data.payload, result.data.options);

		return 'created';
	}
}
