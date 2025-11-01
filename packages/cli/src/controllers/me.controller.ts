import {
	passwordSchema,
	PasswordUpdateRequestDto,
	SettingsUpdateRequestDto,
	UserUpdateRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User, PublicUser } from '@n8n/db';
import { UserRepository, AuthenticatedRequest } from '@n8n/db';
import { Body, Patch, Post, RestController } from '@n8n/decorators';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';

import { PersonalizationSurveyAnswersV4 } from './survey-answers.dto';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { MfaService } from '@/mfa/mfa.service';
import { MeRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { isSamlLicensedAndEnabled } from '@/sso.ee/saml/saml-helpers';
import {
	getCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	isOidcCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

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
		const {
			id: userId,
			email: currentEmail,
			firstName: currentFirstName,
			lastName: currentLastName,
		} = req.user;

		const { currentPassword, ...payloadWithoutPassword } = payload;
		const { email, firstName, lastName } = payload;
		const isEmailBeingChanged = email !== currentEmail;
		const isFirstNameChanged = firstName !== currentFirstName;
		const isLastNameChanged = lastName !== currentLastName;

		if (
			(isLdapCurrentAuthenticationMethod() || isOidcCurrentAuthenticationMethod()) &&
			(isEmailBeingChanged || isFirstNameChanged || isLastNameChanged)
		) {
			this.logger.debug(
				`Request to update user failed because ${getCurrentAuthenticationMethod()} user may not change their profile information`,
				{
					userId,
					payload: payloadWithoutPassword,
				},
			);
			throw new BadRequestError(
				` ${getCurrentAuthenticationMethod()} user may not change their profile information`,
			);
		}

		await this.validateChangingUserEmail(req.user, payload);

		await this.externalHooks.run('user.profile.beforeUpdate', [
			userId,
			currentEmail,
			payloadWithoutPassword,
		]);

		const preUpdateUser = await this.userRepository.findOneByOrFail({ id: userId });
		await this.userService.update(userId, payloadWithoutPassword);
		const user = await this.userRepository.findOneOrFail({
			where: { id: userId },
			relations: ['role'],
		});

		this.logger.info('User updated successfully', { userId });

		this.authService.issueCookie(res, user, req.authInfo?.usedMfa ?? false, req.browserId);

		const changeableFields = ['email', 'firstName', 'lastName'] as const;
		const fieldsChanged = changeableFields.filter(
			(key) => key in payload && payload[key] !== preUpdateUser[key],
		);

		this.eventService.emit('user-updated', { user, fieldsChanged });

		const publicUser = await this.userService.toPublic(user);

		await this.externalHooks.run('user.profile.update', [currentEmail, publicUser]);

		return publicUser;
	}

	private async validateChangingUserEmail(currentUser: User, payload: UserUpdateRequestDto) {
		if (!payload.email || payload.email === currentUser.email) {
			// email is not being changed
			return;
		}
		const { currentPassword: providedCurrentPassword, ...payloadWithoutPassword } = payload;
		const { id: userId, mfaEnabled } = currentUser;

		// If SAML is enabled, we don't allow the user to change their email address
		if (isSamlLicensedAndEnabled()) {
			this.logger.debug(
				'Request to update user failed because SAML user may not change their email',
				{
					userId: currentUser.id,
					payload: payloadWithoutPassword,
				},
			);
			throw new BadRequestError('SAML user may not change their email');
		}

		if (mfaEnabled) {
			if (!payload.mfaCode) {
				throw new BadRequestError('Two-factor code is required to change email');
			}

			const isMfaCodeValid = await this.mfaService.validateMfa(userId, payload.mfaCode, undefined);
			if (!isMfaCodeValid) {
				throw new InvalidMfaCodeError();
			}
		} else {
			if (currentUser.password === null) {
				this.logger.debug('User with no password changed their email', {
					userId: currentUser.id,
					payload: payloadWithoutPassword,
				});
				return;
			}

			if (!providedCurrentPassword || typeof providedCurrentPassword !== 'string') {
				throw new BadRequestError('Current password is required to change email');
			}

			const isProvidedPasswordCorrect = await this.passwordUtility.compare(
				providedCurrentPassword,
				currentUser.password,
			);
			if (!isProvidedPasswordCorrect) {
				throw new BadRequestError(
					'Unable to update profile. Please check your credentials and try again.',
				);
			}
		}
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

		if (!user.password) {
			throw new BadRequestError('Requesting user not set up.');
		}

		const isCurrentPwCorrect = await this.passwordUtility.compare(currentPassword, user.password);
		if (!isCurrentPwCorrect) {
			throw new BadRequestError('Provided current password is incorrect.');
		}

		const passwordValidation = passwordSchema.safeParse(newPassword);
		if (!passwordValidation.success) {
			throw new BadRequestError(
				passwordValidation.error.errors.map(({ message }) => message).join(' '),
			);
		}

		if (user.mfaEnabled) {
			if (typeof mfaCode !== 'string') {
				throw new BadRequestError('Two-factor code is required to change password.');
			}

			const isMfaCodeValid = await this.mfaService.validateMfa(user.id, mfaCode, undefined);
			if (!isMfaCodeValid) {
				throw new InvalidMfaCodeError();
			}
		}

		user.password = await this.passwordUtility.hash(newPassword);

		const updatedUser = await this.userRepository.save(user, { transaction: false });
		this.logger.info('Password updated successfully', { userId: user.id });

		this.authService.issueCookie(res, updatedUser, req.authInfo?.usedMfa ?? false, req.browserId);

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
