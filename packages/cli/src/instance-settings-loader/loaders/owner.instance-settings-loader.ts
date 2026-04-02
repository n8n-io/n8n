import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';

import { OwnershipService } from '@/services/ownership.service';

/** Bcrypt hash format: $2b$NN$<53 base64 chars> (60 chars total) */
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const ownerEnvSchema = z
	.object({
		ownerEmail: z
			.string()
			.min(
				1,
				'INSTANCE_OWNER_EMAIL is required when INSTANCE_OWNER_PASSWORD_HASH or INSTANCE_OWNER_OVERRIDE is set',
			),
		ownerPasswordHash: z
			.string()
			.min(
				1,
				'INSTANCE_OWNER_PASSWORD_HASH is required when INSTANCE_OWNER_EMAIL or INSTANCE_OWNER_OVERRIDE is set',
			)
			.regex(
				BCRYPT_HASH_RE,
				'INSTANCE_OWNER_PASSWORD_HASH is not a valid bcrypt hash. Provide a pre-hashed bcrypt string.',
			),
		ownerFirstName: z.string(),
		ownerLastName: z.string(),
		ownerOverride: z.boolean(),
	})
	.transform(({ ownerEmail, ownerPasswordHash, ownerFirstName, ownerLastName, ownerOverride }) => ({
		payload: {
			email: ownerEmail,
			firstName: ownerFirstName,
			lastName: ownerLastName,
			password: ownerPasswordHash,
		},
		options: { overwriteExisting: ownerOverride, passwordIsHashed: true as const },
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
		const { ownerOverride, ownerEmail, ownerPasswordHash } = this.instanceSettingsLoaderConfig;
		if (!ownerOverride && !ownerEmail && !ownerPasswordHash) return 'skipped';

		const result = ownerEnvSchema.safeParse(this.instanceSettingsLoaderConfig);

		if (!result.success) {
			throw new OperationalError(result.error.issues[0].message);
		}

		await this.ownershipService.setupOwner(result.data.payload, result.data.options);

		return 'created';
	}
}
