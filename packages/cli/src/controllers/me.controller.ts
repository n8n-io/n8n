import validator from 'validator';
import { plainToInstance } from 'class-transformer';
import { type RequestHandler, Response } from 'express';
import { randomBytes } from 'crypto';

import { AuthService } from '@/auth/auth.service';
import { Delete, Get, Patch, Post, RestController } from '@/decorators';
import { PasswordUtility } from '@/services/password.utility';
import { validateEntity } from '@/generic-helpers';
import type { User } from '@/databases/entities/user';
import {
	AuthenticatedRequest,
	MeRequest,
	UserSettingsUpdatePayload,
	UserUpdatePayload,
} from '@/requests';
import type { PublicUser } from '@/interfaces';
import { isSamlLicensedAndEnabled } from '@/sso/saml/saml-helpers';
import { UserService } from '@/services/user.service';
import { Logger } from '@/logger';
import { ExternalHooks } from '@/external-hooks';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UserRepository } from '@/databases/repositories/user.repository';
import { isApiEnabled } from '@/public-api';
import { EventService } from '@/events/event.service';
import { MfaService } from '@/mfa/mfa.service';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { PersonalizationSurveyAnswersV4 } from './survey-answers.dto';

export const API_KEY_PREFIX = 'n8n_api_';

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
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
		private readonly eventService: EventService,
		private readonly mfaService: MfaService,
	) {}

	/**
	 * Update the logged-in user's properties, except password.
	 */
	@Patch('/')
	async updateCurrentUser(req: MeRequest.UserUpdate, res: Response): Promise<PublicUser> {
		const { id: userId, email: currentEmail, mfaEnabled } = req.user;

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

		const isEmailBeingChanged = email !== currentEmail;

		// If SAML is enabled, we don't allow the user to change their email address
		if (isSamlLicensedAndEnabled() && isEmailBeingChanged) {
			this.logger.debug(
				'Request to update user failed because SAML user may not change their email',
				{
					userId,
					payload,
				},
			);
			throw new BadRequestError('SAML user may not change their email');
		}

		if (mfaEnabled && isEmailBeingChanged) {
			if (!payload.mfaCode) {
				throw new BadRequestError('Two-factor code is required to change email');
			}

			const isMfaTokenValid = await this.mfaService.validateMfa(userId, payload.mfaCode, undefined);
			if (!isMfaTokenValid) {
				throw new InvalidMfaCodeError();
			}
		}

		await this.externalHooks.run('user.profile.beforeUpdate', [userId, currentEmail, payload]);

		const preUpdateUser = await this.userRepository.findOneByOrFail({ id: userId });
		await this.userService.update(userId, payload);
		const user = await this.userRepository.findOneOrFail({
			where: { id: userId },
		});

		this.logger.info('User updated successfully', { userId });

		this.authService.issueCookie(res, user, req.browserId);

		const changeableFields = ['email', 'firstName', 'lastName'] as const;
		const fieldsChanged = changeableFields.filter(
			(key) => key in payload && payload[key] !== preUpdateUser[key],
		);

		this.eventService.emit('user-updated', { user, fieldsChanged });

		const publicUser = await this.userService.toPublic(user);

		await this.externalHooks.run('user.profile.update', [currentEmail, publicUser]);

		return publicUser;
	}

	/**
	 * Update the logged-in user's password.
	 */
	@Patch('/password', { rateLimit: true })
	async updatePassword(req: MeRequest.Password, res: Response) {
		const { user } = req;
		const { currentPassword, newPassword, mfaCode } = req.body;

		// If SAML is enabled, we don't allow the user to change their password
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

		if (user.mfaEnabled) {
			if (typeof mfaCode !== 'string') {
				throw new BadRequestError('Two-factor code is required to change password.');
			}

			const isMfaTokenValid = await this.mfaService.validateMfa(user.id, mfaCode, undefined);
			if (!isMfaTokenValid) {
				throw new InvalidMfaCodeError();
			}
		}

		user.password = await this.passwordUtility.hash(validPassword);

		const updatedUser = await this.userRepository.save(user, { transaction: false });
		this.logger.info('Password updated successfully', { userId: user.id });

		this.authService.issueCookie(res, updatedUser, req.browserId);

		this.eventService.emit('user-updated', { user: updatedUser, fieldsChanged: ['password'] });

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
				'Request to store user personalization survey failed because of undefined payload',
				{
					userId: req.user.id,
				},
			);
			throw new BadRequestError('Personalization answers are mandatory');
		}

		const validatedAnswers = plainToInstance(
			PersonalizationSurveyAnswersV4,
			personalizationAnswers,
			{ excludeExtraneousValues: true },
		);

		await validateEntity(validatedAnswers);

		await this.userRepository.save(
			{
				id: req.user.id,
				personalizationAnswers: validatedAnswers,
			},
			{ transaction: false },
		);

		this.logger.info('User survey updated successfully', { userId: req.user.id });

		this.eventService.emit('user-submitted-personalization-survey', {
			userId: req.user.id,
			answers: validatedAnswers,
		});

		return { success: true };
	}

	/**
	 * Creates an API Key
	 */
	@Post('/api-key', { middlewares: [isApiEnabledMiddleware] })
	async createAPIKey(req: AuthenticatedRequest) {
		const apiKey = `n8n_api_${randomBytes(40).toString('hex')}`;

		await this.userService.update(req.user.id, { apiKey });

		this.eventService.emit('public-api-key-created', { user: req.user, publicApi: false });

		return { apiKey };
	}

	/**
	 * Get an API Key
	 */
	@Get('/api-key', { middlewares: [isApiEnabledMiddleware] })
	async getAPIKey(req: AuthenticatedRequest) {
		const apiKey = this.redactApiKey(req.user.apiKey);
		return { apiKey };
	}

	/**
	 * Deletes an API Key
	 */
	@Delete('/api-key', { middlewares: [isApiEnabledMiddleware] })
	async deleteAPIKey(req: AuthenticatedRequest) {
		await this.userService.update(req.user.id, { apiKey: null });

		this.eventService.emit('public-api-key-deleted', { user: req.user, publicApi: false });

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

		await validateEntity(payload);

		const { id } = req.user;

		await this.userService.updateSettings(id, payload);

		const user = await this.userRepository.findOneOrFail({
			select: ['settings'],
			where: { id },
		});

		return user.settings;
	}

	private redactApiKey(apiKey: string | null) {
		if (!apiKey) return;
		const keepLength = 5;
		return (
			API_KEY_PREFIX +
			apiKey.slice(API_KEY_PREFIX.length, API_KEY_PREFIX.length + keepLength) +
			'*'.repeat(apiKey.length - API_KEY_PREFIX.length - keepLength)
		);
	}
}
