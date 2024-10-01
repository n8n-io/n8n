import {
	PasswordUpdateRequestDto,
	SettingsUpdateRequestDto,
	UserUpdateRequestDto,
} from '@n8n/api-types';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import type { User } from '@/databases/entities/user';
import { UserRepository } from '@/databases/repositories/user.repository';
import { Body, Patch, Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import type { PublicUser } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import { MfaService } from '@/mfa/mfa.service';
import { AuthenticatedRequest, MeRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { isSamlLicensedAndEnabled } from '@/sso/saml/saml-helpers';

import { PersonalizationSurveyAnswersV4 } from './survey-answers.dto';
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
	async updateCurrentUser(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: UserUpdateRequestDto,
	): Promise<PublicUser> {
		const { id: userId, email: currentEmail, mfaEnabled } = req.user;

		const { email } = payload;
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
	async updatePassword(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: PasswordUpdateRequestDto,
	) {
		const { user } = req;
		const { currentPassword, newPassword, mfaCode } = payload;

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
	 * Update the logged-in user's settings.
	 */
	@Patch('/settings')
	async updateCurrentUserSettings(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: SettingsUpdateRequestDto,
	): Promise<User['settings']> {
		const { id } = req.user;

		await this.userService.updateSettings(id, payload);

		const user = await this.userRepository.findOneOrFail({
			select: ['settings'],
			where: { id },
		});

		return user.settings;
	}
}
