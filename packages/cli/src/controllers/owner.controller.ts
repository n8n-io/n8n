import { DismissBannerRequestDto, OwnerSetupRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	AuthenticatedRequest,
	GLOBAL_OWNER_ROLE,
	SettingsRepository,
	UserRepository,
} from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { validateEntity } from '@/generic-helpers';
import { PostHogClient } from '@/posthog';
import { BannerService } from '@/services/banner.service';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';

@RestController('/owner')
export class OwnerController {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly settingsRepository: SettingsRepository,
		private readonly authService: AuthService,
		private readonly bannerService: BannerService,
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
	async setupOwner(req: AuthenticatedRequest, res: Response, @Body payload: OwnerSetupRequestDto) {
		const { email, firstName, lastName, password } = payload;

		if (config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
			);
			throw new BadRequestError('Instance owner already setup');
		}

		let owner = await this.userRepository.findOneOrFail({
			where: { role: { slug: GLOBAL_OWNER_ROLE.slug } },
			relations: ['role'],
		});
		owner.email = email;
		owner.firstName = firstName;
		owner.lastName = lastName;
		owner.password = await this.passwordUtility.hash(password);

		// TODO: move XSS validation out into the DTO class
		await validateEntity(owner);

		owner = await this.userRepository.save(owner, { transaction: false });

		this.logger.info('Owner was set up successfully');

		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);

		config.set('userManagement.isInstanceOwnerSetUp', true);

		this.logger.debug('Setting isInstanceOwnerSetUp updated successfully');

		this.authService.issueCookie(res, owner, req.authInfo?.usedMfa ?? false, req.browserId);

		this.eventService.emit('instance-owner-setup', { userId: owner.id });

		return await this.userService.toPublic(owner, { posthog: this.postHog, withScopes: true });
	}

	@Post('/dismiss-banner')
	@GlobalScope('banner:dismiss')
	async dismissBanner(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: DismissBannerRequestDto,
	) {
		const bannerName = payload.banner;
		if (!bannerName) return;
		await this.bannerService.dismissBanner(bannerName);
	}
}
