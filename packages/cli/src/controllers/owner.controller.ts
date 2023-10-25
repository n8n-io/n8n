import validator from 'validator';
import { validateEntity } from '@/GenericHelpers';
import { Authorized, Post, RestController } from '@/decorators';
import { BadRequestError } from '@/ResponseHelper';
import { hashPassword, validatePassword } from '@/UserManagement/UserManagementHelper';
import { issueCookie } from '@/auth/jwt';
import { Response } from 'express';
import { Config } from '@/config';
import { OwnerRequest } from '@/requests';
import { IInternalHooksClass } from '@/Interfaces';
import { SettingsRepository } from '@db/repositories';
import { PostHogClient } from '@/posthog';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';

@Authorized(['global', 'owner'])
@RestController('/owner')
export class OwnerController {
	constructor(
		private readonly config: Config,
		private readonly logger: Logger,
		private readonly internalHooks: IInternalHooksClass,
		private readonly settingsRepository: SettingsRepository,
		private readonly userService: UserService,
		private readonly postHog?: PostHogClient,
	) {}

	/**
	 * Promote a shell into the owner of the n8n instance,
	 * and enable `isInstanceOwnerSetUp` setting.
	 */
	@Post('/setup')
	async setupOwner(req: OwnerRequest.Post, res: Response) {
		const { email, firstName, lastName, password } = req.body;
		const { id: userId, globalRole } = req.user;

		if (this.config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
				{
					userId,
				},
			);
			throw new BadRequestError('Instance owner already setup');
		}

		if (!email || !validator.isEmail(email)) {
			this.logger.debug('Request to claim instance ownership failed because of invalid email', {
				userId,
				invalidEmail: email,
			});
			throw new BadRequestError('Invalid email address');
		}

		const validPassword = validatePassword(password);

		if (!firstName || !lastName) {
			this.logger.debug(
				'Request to claim instance ownership failed because of missing first name or last name in payload',
				{ userId, payload: req.body },
			);
			throw new BadRequestError('First and last names are mandatory');
		}

		// TODO: This check should be in a middleware outside this class
		if (globalRole.scope === 'global' && globalRole.name !== 'owner') {
			this.logger.debug(
				'Request to claim instance ownership failed because user shell does not exist or has wrong role!',
				{
					userId,
				},
			);
			throw new BadRequestError('Invalid request');
		}

		let owner = req.user;

		Object.assign(owner, {
			email,
			firstName,
			lastName,
			password: await hashPassword(validPassword),
		});

		await validateEntity(owner);

		owner = await this.userService.save(owner);

		this.logger.info('Owner was set up successfully', { userId });

		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);

		this.config.set('userManagement.isInstanceOwnerSetUp', true);

		this.logger.debug('Setting isInstanceOwnerSetUp updated successfully', { userId });

		await issueCookie(res, owner);

		void this.internalHooks.onInstanceOwnerSetup({ user_id: userId });

		return this.userService.toPublic(owner, { posthog: this.postHog });
	}

	@Post('/dismiss-banner')
	async dismissBanner(req: OwnerRequest.DismissBanner) {
		const bannerName = 'banner' in req.body ? (req.body.banner as string) : '';
		const response = await this.settingsRepository.dismissBanner({ bannerName });
		return response;
	}
}
