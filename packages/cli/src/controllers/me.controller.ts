import validator from 'validator';
import { plainToInstance } from 'class-transformer';
import { type RequestHandler, Response } from 'express';
import { randomBytes } from 'crypto';

import { AuthService } from '@/auth/auth.service';
import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import { PasswordUtility } from '@/services/password.utility';
import { validateEntity } from '@/GenericHelpers';
import type { User } from '@db/entities/User';
import {
	AuthenticatedRequest,
	MeRequest,
	UserSettingsUpdatePayload,
	UserUpdatePayload,
} from '@/requests';
import type { PublicUser } from '@/Interfaces';
import { isSamlLicensedAndEnabled } from '@/sso/saml/samlHelpers';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UserRepository } from '@/databases/repositories/user.repository';
import { isApiEnabled } from '@/PublicApi';

export const isApiEnabledMiddleware: RequestHandler = (_, res, next) => {
	if (isApiEnabled()) {
		next();
	} else {
		res.status(404).end();
	}
};

@RestController('/me')
export class MeController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly internalHooks: InternalHooks,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
	) {}

	/**
	 * Update the logged-in user's properties, except password.
	 */
	@Patch('/')
	async updateCurrentUser(req: MeRequest.UserUpdate, res: Response): Promise<PublicUser> {
		const { id: userId, email: currentEmail } = req.user;
		const payload = plainToInstance(UserUpdatePayload, req.body, { excludeExtraneousValues: true });

		const { email } = payload;
		if (!email) {
			this.logger.debug('Request to update user email failed because of missing email in payload', {
				userId,
				payload,
			});
			throw new BadRequestError('Email is mandatory');
		}

		if (!validator.isEmail(email)) {
			this.logger.debug('Request to update user email failed because of invalid email in payload', {
				userId,
				invalidEmail: email,
			});
			throw new BadRequestError('Invalid email address');
		}

		await validateEntity(payload);

		// If SAML is enabled, we don't allow the user to change their email address
		if (isSamlLicensedAndEnabled()) {
			if (email !== currentEmail) {
				this.logger.debug(
					'Request to update user failed because SAML user may not change their email',
					{
						userId,
						payload,
					},
				);
				throw new BadRequestError('SAML user may not change their email');
			}
		}

		await this.externalHooks.run('user.profile.beforeUpdate', [userId, currentEmail, payload]);

		await this.userService.update(userId, payload);
		const user = await this.userRepository.findOneOrFail({
			where: { id: userId },
		});

		this.logger.info('User updated successfully', { userId });

		this.authService.issueCookie(res, user, req.browserId);

		const updatedKeys = Object.keys(payload);
		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: updatedKeys,
		});

		const publicUser = await this.userService.toPublic(user);

		await this.externalHooks.run('user.profile.update', [currentEmail, publicUser]);

		return publicUser;
	}

	/**
	 * Update the logged-in user's password.
	 */
	@Patch('/password')
	async updatePassword(req: MeRequest.Password, res: Response) {
		const { user } = req;
		const { currentPassword, newPassword } = req.body;

		// If SAML is enabled, we don't allow the user to change their email address
		if (isSamlLicensedAndEnabled()) {
			this.logger.debug('Attempted to change password for user, while SAML is enabled', {
				userId: user.id,
			});
			throw new BadRequestError(
				'With SAML enabled, users need to use their SAML provider to change passwords',
			);
		}

		if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
			throw new BadRequestError('Invalid payload.');
		}

		if (!user.password) {
			throw new BadRequestError('Requesting user not set up.');
		}

		const isCurrentPwCorrect = await this.passwordUtility.compare(currentPassword, user.password);
		if (!isCurrentPwCorrect) {
			throw new BadRequestError('Provided current password is incorrect.');
		}

		const validPassword = this.passwordUtility.validate(newPassword);

		user.password = await this.passwordUtility.hash(validPassword);

		const updatedUser = await this.userRepository.save(user, { transaction: false });
		this.logger.info('Password updated successfully', { userId: user.id });

		this.authService.issueCookie(res, updatedUser, req.browserId);

		void this.internalHooks.onUserUpdate({
			user: updatedUser,
			fields_changed: ['password'],
		});

		await this.externalHooks.run('user.password.update', [updatedUser.email, updatedUser.password]);

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

		await this.userRepository.save(
			{
				id: req.user.id,
				personalizationAnswers,
			},
			{ transaction: false },
		);

		this.logger.info('User survey updated successfully', { userId: req.user.id });

		void this.internalHooks.onPersonalizationSurveySubmitted(req.user.id, personalizationAnswers);

		return { success: true };
	}

	/**
	 * Creates an API Key
	 */
	@Post('/api-key', { middlewares: [isApiEnabledMiddleware] })
	async createAPIKey(req: AuthenticatedRequest) {
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

		await this.userService.update(req.user.id, { apiKey });

		void this.internalHooks.onApiKeyCreated({
			user: req.user,
			public_api: false,
		});

		return { apiKey };
	}

	/**
	 * Get an API Key
	 */
	@Get('/api-key', { middlewares: [isApiEnabledMiddleware] })
	async getAPIKey(req: AuthenticatedRequest) {
		return { apiKey: req.user.apiKey };
	}

	/**
	 * Deletes an API Key
	 */
	@Delete('/api-key', { middlewares: [isApiEnabledMiddleware] })
	async deleteAPIKey(req: AuthenticatedRequest) {
		await this.userService.update(req.user.id, { apiKey: null });

		void this.internalHooks.onApiKeyDeleted({
			user: req.user,
			public_api: false,
		});

		return { success: true };
	}

	/**
	 * Update the logged-in user's settings.
	 */
	@Patch('/settings')
	async updateCurrentUserSettings(req: MeRequest.UserSettingsUpdate): Promise<User['settings']> {
		const payload = plainToInstance(UserSettingsUpdatePayload, req.body, {
			excludeExtraneousValues: true,
		});
		const { id } = req.user;

		await this.userService.updateSettings(id, payload);

		const user = await this.userRepository.findOneOrFail({
			select: ['settings'],
			where: { id },
		});

		return user.settings;
	}
}
