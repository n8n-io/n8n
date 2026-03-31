import { Logger } from '@n8n/backend-common';
import { BootstrapConfig } from '@n8n/config';
import { GLOBAL_OWNER_ROLE, SettingsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { OwnershipService } from '@/services/ownership.service';

/** Bcrypt hash format: $2b$NN$<53 base64 chars> (60 chars total) */
const BCRYPT_HASH_RE = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

@Service()
export class OwnerBootstrapStep {
	constructor(
		private readonly config: BootstrapConfig,
		private readonly ownershipService: OwnershipService,
		private readonly settingsRepository: SettingsRepository,
		private readonly userRepository: UserRepository,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('bootstrap');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.ownerEmail) return 'skipped';

		const setting = await this.settingsRepository.findByKey('userManagement.isInstanceOwnerSetUp');
		if (setting?.value === JSON.stringify(true)) return 'skipped';

		try {
			if (this.config.ownerPasswordHash) {
				await this.setupOwnerWithHash();
			} else {
				await this.ownershipService.setupOwner({
					email: this.config.ownerEmail,
					firstName: this.config.ownerFirstName,
					lastName: this.config.ownerLastName,
					password: this.config.ownerPassword,
				});
			}
		} catch (error) {
			// Another instance won the race — treat as skipped
			if (error instanceof Error && error.message === 'Instance owner already setup') {
				return 'skipped';
			}
			throw error;
		}

		return 'created';
	}

	/**
	 * Writes a pre-hashed bcrypt password directly to the owner record,
	 * bypassing `OwnershipService.setupOwner()` which always re-hashes.
	 */
	private async setupOwnerWithHash(): Promise<void> {
		if (!BCRYPT_HASH_RE.test(this.config.ownerPasswordHash)) {
			this.logger.warn(
				'Bootstrap: owner step skipped — N8N_INIT_OWNER_PASSWORD_HASH is not a valid bcrypt hash',
			);
			return;
		}

		const shellUser = await this.userRepository.findOneOrFail({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});

		shellUser.email = this.config.ownerEmail;
		shellUser.firstName = this.config.ownerFirstName;
		shellUser.lastName = this.config.ownerLastName;
		shellUser.lastActiveAt = new Date();
		shellUser.password = this.config.ownerPasswordHash;

		await this.userRepository.save(shellUser, { transaction: false });

		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
	}
}
