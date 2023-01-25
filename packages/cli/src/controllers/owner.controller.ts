import validator from 'validator';
import { validateEntity } from '@/GenericHelpers';
import { Post, RestController } from '@/decorators';
import { BadRequestError } from '@/ResponseHelper';
import {
	hashPassword,
	sanitizeUser,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import { issueCookie } from '@/auth/jwt';
import type { Response } from 'express';
import type { Repository } from 'typeorm';
import type { ILogger } from 'n8n-workflow';
import type { Config } from '@/config';
import type { OwnerRequest } from '@/requests';
import type { IDatabaseCollections, IInternalHooksClass } from '@/Interfaces';
import type { Settings } from '@db/entities/Settings';
import type { User } from '@db/entities/User';

@RestController('/owner')
export class OwnerController {
	private readonly config: Config;

	private readonly logger: ILogger;

	private readonly internalHooks: IInternalHooksClass;

	private readonly userRepository: Repository<User>;

	private readonly settingsRepository: Repository<Settings>;

	constructor({
		config,
		logger,
		internalHooks,
		repositories,
	}: {
		config: Config;
		logger: ILogger;
		internalHooks: IInternalHooksClass;
		repositories: Pick<IDatabaseCollections, 'User' | 'Settings'>;
	}) {
		this.config = config;
		this.logger = logger;
		this.internalHooks = internalHooks;
		this.userRepository = repositories.User;
		this.settingsRepository = repositories.Settings;
	}

	/**
	 * Promote a shell into the owner of the n8n instance,
	 * and enable `isInstanceOwnerSetUp` setting.
	 */
	@Post('/')
	async promoteOwner(req: OwnerRequest.Post, res: Response) {
		const { email, firstName, lastName, password } = req.body;
		const { id: userId } = req.user;

		if (this.config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
				{
					userId,
				},
			);
			throw new BadRequestError('Invalid request');
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

		let owner = await this.userRepository.findOne({
			relations: ['globalRole'],
			where: { id: userId },
		});

		if (!owner || (owner.globalRole.scope === 'global' && owner.globalRole.name !== 'owner')) {
			this.logger.debug(
				'Request to claim instance ownership failed because user shell does not exist or has wrong role!',
				{
					userId,
				},
			);
			throw new BadRequestError('Invalid request');
		}

		Object.assign(owner, {
			email,
			firstName,
			lastName,
			password: await hashPassword(validPassword),
		});

		await validateEntity(owner);

		owner = await this.userRepository.save(owner);

		this.logger.info('Owner was set up successfully', { userId: req.user.id });

		await this.settingsRepository.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);

		this.config.set('userManagement.isInstanceOwnerSetUp', true);

		this.logger.debug('Setting isInstanceOwnerSetUp updated successfully', { userId: req.user.id });

		await issueCookie(res, owner);

		void this.internalHooks.onInstanceOwnerSetup({ user_id: userId });

		return sanitizeUser(owner);
	}

	/**
	 * Persist that the instance owner setup has been skipped
	 */
	@Post('/skip-setup')
	async skipSetup() {
		await this.settingsRepository.update(
			{ key: 'userManagement.skipInstanceOwnerSetup' },
			{ value: JSON.stringify(true) },
		);

		this.config.set('userManagement.skipInstanceOwnerSetup', true);

		return { success: true };
	}
}
