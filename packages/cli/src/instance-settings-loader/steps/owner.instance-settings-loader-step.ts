import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE, SettingsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import config from '@/config';

/** Bcrypt hash format: $2b$NN$<53 base64 chars> (60 chars total) */
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

@Service()
export class OwnerInstanceSettingsLoaderStep {
	constructor(
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly settingsRepository: SettingsRepository,
		private readonly userRepository: UserRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.instanceSettingsLoaderConfig.ownerOverride) return 'skipped';

		if (!this.instanceSettingsLoaderConfig.ownerEmail) {
			this.logger.warn(
				'Instance settings loader: owner step skipped — INSTANCE_OWNER_EMAIL is required when INSTANCE_OWNER_OVERRIDE is true',
			);
			return 'skipped';
		}

		if (!this.instanceSettingsLoaderConfig.ownerPasswordHash) {
			this.logger.warn(
				'Instance settings loader: owner step skipped — INSTANCE_OWNER_PASSWORD_HASH is required when INSTANCE_OWNER_OVERRIDE is true',
			);
			return 'skipped';
		}

		if (!BCRYPT_HASH_RE.test(this.instanceSettingsLoaderConfig.ownerPasswordHash)) {
			this.logger.warn(
				'Instance settings loader: owner step skipped — INSTANCE_OWNER_PASSWORD_HASH is not a valid bcrypt hash',
			);
			return 'skipped';
		}

		const shellUser = await this.userRepository.findOneOrFail({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});

		shellUser.email = this.instanceSettingsLoaderConfig.ownerEmail;
		shellUser.firstName = this.instanceSettingsLoaderConfig.ownerFirstName;
		shellUser.lastName = this.instanceSettingsLoaderConfig.ownerLastName;
		shellUser.lastActiveAt = new Date();
		shellUser.password = this.instanceSettingsLoaderConfig.ownerPasswordHash;

		await this.userRepository.save(shellUser, { transaction: false });

		this.logger.info('Instance owner was set up successfully via environment variables');

		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
		config.set('userManagement.isInstanceOwnerSetUp', true);

		return 'created';
	}
}
