import { Response } from 'express';
import validator from 'validator';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { GlobalScope, Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { validateEntity } from '@/generic-helpers';
import { Logger } from '@/logging/logger.service';
import { PostHogClient } from '@/posthog';
import { OwnerRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';

@RestController('/owner')
export class OwnerController {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly settingsRepository: SettingsRepository,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly passwordUtility: PasswordUtility,
		private readonly postHog: PostHogClient,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Promote a shell into the owner of the n8n instance,
	 * and enable `isInstanceOwnerSetUp` setting.
	 */
	@Post('/setup', { skipAuth: true })
	async setupOwner(req: OwnerRequest.Post, res: Response) {
		const { email, firstName, lastName, password } = req.body;

		if (config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
			);
			throw new BadRequestError('Instance owner already setup');
		}

		if (!email || !validator.isEmail(email)) {
			this.logger.debug('Request to claim instance ownership failed because of invalid email', {
				invalidEmail: email,
			});
			throw new BadRequestError('Invalid email address');
		}

		const validPassword = this.passwordUtility.validate(password);

		if (!firstName || !lastName) {
			this.logger.debug(
				'Request to claim instance ownership failed because of missing first name or last name in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('First and last names are mandatory');
		}

		let owner = await this.userRepository.findOneOrFail({
			where: { role: 'global:owner' },
		});
		owner.email = email;
		owner.firstName = firstName;
		owner.lastName = lastName;
		owner.password = await this.passwordUtility.hash(validPassword);

		await validateEntity(owner);

		owner = await this.userRepository.save(owner, { transaction: false });

		this.logger.info('Owner was set up successfully');

		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);

		config.set('userManagement.isInstanceOwnerSetUp', true);

		this.logger.debug('Setting isInstanceOwnerSetUp updated successfully');

		this.authService.issueCookie(res, owner, req.browserId);

		this.eventService.emit('instance-owner-setup', { userId: owner.id });

		return await this.userService.toPublic(owner, { posthog: this.postHog, withScopes: true });
	}

	@Post('/dismiss-banner')
	@GlobalScope('banner:dismiss')
	async dismissBanner(req: OwnerRequest.DismissBanner) {
		const bannerName = 'banner' in req.body ? (req.body.banner as string) : '';
		return await this.settingsRepository.dismissBanner({ bannerName });
	}
}
