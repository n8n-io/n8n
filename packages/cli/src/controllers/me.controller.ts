import validator from 'validator';
import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import {
	compareHash,
	hashPassword,
	sanitizeUser,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import { BadRequestError } from '@/ResponseHelper';
import { User } from '@db/entities/User';
import { validateEntity } from '@/GenericHelpers';
import { issueCookie } from '@/auth/jwt';
import { Response } from 'express';
import type { Repository } from 'typeorm';
import type { ILogger } from 'n8n-workflow';
import { AuthenticatedRequest, MeRequest } from '@/requests';
import type {
	PublicUser,
	IDatabaseCollections,
	IExternalHooksClass,
	IInternalHooksClass,
} from '@/Interfaces';
import { randomBytes } from 'crypto';

@RestController('/me')
export class MeController {
	private readonly logger: ILogger;

	private readonly externalHooks: IExternalHooksClass;

	private readonly internalHooks: IInternalHooksClass;

	private readonly userRepository: Repository<User>;

	constructor({
		logger,
		externalHooks,
		internalHooks,
		repositories,
	}: {
		logger: ILogger;
		externalHooks: IExternalHooksClass;
		internalHooks: IInternalHooksClass;
		repositories: Pick<IDatabaseCollections, 'User'>;
	}) {
		this.logger = logger;
		this.externalHooks = externalHooks;
		this.internalHooks = internalHooks;
		this.userRepository = repositories.User;
	}

	/**
	 * Return the logged-in user.
	 */
	@Get('/')
	async getCurrentUser(req: AuthenticatedRequest): Promise<PublicUser> {
		return sanitizeUser(req.user);
	}

	/**
	 * Update the logged-in user's settings, except password.
	 */
	@Patch('/')
	async updateCurrentUser(req: MeRequest.Settings, res: Response): Promise<PublicUser> {
		const { email } = req.body;
		if (!email) {
			this.logger.debug('Request to update user email failed because of missing email in payload', {
				userId: req.user.id,
				payload: req.body,
			});
			throw new BadRequestError('Email is mandatory');
		}

		if (!validator.isEmail(email)) {
			this.logger.debug('Request to update user email failed because of invalid email in payload', {
				userId: req.user.id,
				invalidEmail: email,
			});
			throw new BadRequestError('Invalid email address');
		}

		const { email: currentEmail } = req.user;
		const newUser = new User();

		Object.assign(newUser, req.user, req.body);

		await validateEntity(newUser);

		const user = await this.userRepository.save(newUser);

		this.logger.info('User updated successfully', { userId: user.id });

		await issueCookie(res, user);

		const updatedKeys = Object.keys(req.body);
		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: updatedKeys,
		});

		await this.externalHooks.run('user.profile.update', [currentEmail, sanitizeUser(user)]);

		return sanitizeUser(user);
	}

	/**
	 * Update the logged-in user's password.
	 */
	@Patch('/password')
	async updatePassword(req: MeRequest.Password, res: Response) {
		const { currentPassword, newPassword } = req.body;

		if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
			throw new BadRequestError('Invalid payload.');
		}

		if (!req.user.password) {
			throw new BadRequestError('Requesting user not set up.');
		}

		const isCurrentPwCorrect = await compareHash(currentPassword, req.user.password);
		if (!isCurrentPwCorrect) {
			throw new BadRequestError('Provided current password is incorrect.');
		}

		const validPassword = validatePassword(newPassword);

		req.user.password = await hashPassword(validPassword);

		const user = await this.userRepository.save(req.user);
		this.logger.info('Password updated successfully', { userId: user.id });

		await issueCookie(res, user);

		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: ['password'],
		});

		await this.externalHooks.run('user.password.update', [user.email, req.user.password]);

		return { success: true };
	}

	/**
	 * Store the logged-in user's survey answers.
	 */
	@Post('/survey')
	async storeSurveyAnswers(req: MeRequest.SurveyAnswers) {
		const { body: personalizationAnswers } = req;

		if (!personalizationAnswers) {
			this.logger.debug(
				'Request to store user personalization survey failed because of empty payload',
				{
					userId: req.user.id,
				},
			);
			throw new BadRequestError('Personalization answers are mandatory');
		}

		await this.userRepository.save({
			id: req.user.id,
			personalizationAnswers,
		});

		this.logger.info('User survey updated successfully', { userId: req.user.id });

		void this.internalHooks.onPersonalizationSurveySubmitted(req.user.id, personalizationAnswers);

		return { success: true };
	}

	/**
	 * Creates an API Key
	 */
	@Post('/api-key')
	async createAPIKey(req: AuthenticatedRequest) {
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

		await this.userRepository.update(req.user.id, {
			apiKey,
		});

		void this.internalHooks.onApiKeyCreated({
			user: req.user,
			public_api: false,
		});

		return { apiKey };
	}

	/**
	 * Get an API Key
	 */
	@Get('/api-key')
	async getAPIKey(req: AuthenticatedRequest) {
		return { apiKey: req.user.apiKey };
	}

	/**
	 * Deletes an API Key
	 */
	@Delete('/api-key')
	async deleteAPIKey(req: AuthenticatedRequest) {
		await this.userRepository.update(req.user.id, {
			apiKey: null,
		});

		void this.internalHooks.onApiKeyDeleted({
			user: req.user,
			public_api: false,
		});

		return { success: true };
	}
}
