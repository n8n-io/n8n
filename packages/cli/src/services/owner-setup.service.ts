import { OwnerSetupRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService, OwnershipService } from '@n8n/backend-services';
import { GLOBAL_OWNER_ROLE, SettingsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import config from '@/config';

import { PasswordUtility } from './password.utility';

@Service()
export class OwnerSetupService {
	constructor(
		private readonly ownershipService: OwnershipService,
		private readonly eventService: EventService,
		private readonly logger: Logger,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
		private readonly settingsRepository: SettingsRepository,
	) {}

	async setupOwner(
		payload: OwnerSetupRequestDto,
		options?: { overwriteExisting?: boolean; passwordIsHashed?: boolean },
	) {
		const { email, firstName, lastName, password } = payload;

		if (!options?.overwriteExisting && (await this.ownershipService.hasInstanceOwner())) {
			this.logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
			);
			throw new BadRequestError('Instance owner already setup');
		}

		let shellUser = await this.userRepository.findOne({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});

		if (!shellUser) {
			this.logger.error('Could not find shell user with global:owner role');
			throw new BadRequestError('Instance owner shell user not found');
		}

		shellUser.email = email.toLowerCase();
		shellUser.firstName = firstName;
		shellUser.lastName = lastName;
		shellUser.lastActiveAt = new Date();
		shellUser.password = options?.passwordIsHashed
			? password
			: await this.passwordUtility.hash(password);

		shellUser = await this.userRepository.save(shellUser, { transaction: false });

		this.logger.info('Owner was set up successfully');
		this.eventService.emit('instance-owner-setup', { userId: shellUser.id });

		// The next block needs to be deleted and is temporary for now
		// See packages/cli/src/config/schema.ts for more info
		// We update the SettingsRepository so when we "startup" next time
		// the config state is restored.
		// #region Delete me
		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);
		config.set('userManagement.isInstanceOwnerSetUp', true);
		// #endregion

		return shellUser;
	}
}
