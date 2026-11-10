import {
	createPasswordSchema,
	PasswordUpdateRequestDto,
	UserSelfSettingsUpdateRequestDto,
	UserUpdateRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { User, PublicUser, AuthIdentity } from '@n8n/db';
import { UserRepository, AuthenticatedRequest, isPerson, PersonRepository } from '@n8n/db';
import { Body, createUserKeyedRateLimiter, Patch, Post, RestController } from '@n8n/decorators';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { ExternalHooks } from '@/external-hooks';
import { validateEntity } from '@/generic-helpers';
import { MfaService } from '@/mfa/mfa.service';
import { MeRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { getCurrentAuthenticationMethod, isSamlLicensedAndEnabled } from '@/sso.ee/sso-helpers';

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
		private readonly personRepository: PersonRepository,
		private readonly eventService: EventService,
		private readonly mfaService: MfaService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Update the logged-in user's properties, except password.
	 */
	@Patch('/')
	async updateCurrentUser(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: UserUpdateRequestDto,
	): Promise<PublicUser> {
		if (!isPerson(req.user)) {
			throw new ForbiddenError('Only a person can change their profile');
		}

		const {
			id: userId,
			email: currentEmail,
			firstName: currentFirstName,
			lastName: currentLastName,
		} = req.user;

		if (this.isUserManagedByEnv(req.user)) {
			throw new ForbiddenError(
				'This account is managed via environment variables and cannot be modified through the API',
			);
		}

		const { firstName, lastName } = payload;
		const isFirstNameChanged = firstName !== currentFirstName;
		const isLastNameChanged = lastName !== currentLastName;

		// Check if the user is authenticated via SSO - they cannot change their profile info
		if (isFirstNameChanged || isLastNameChanged) {
			const ssoIdentity = await this.userService.findSsoIdentity(userId);

			if (ssoIdentity && this.isAuthIdentityActive(ssoIdentity)) {
				this.logger.debug(
					`Request to update user failed because ${ssoIdentity.providerType} user may not change their profile information`,
					{
						userId,
						payload,
					},
				);
				throw new BadRequestError(
					`${ssoIdentity.providerType.toUpperCase()} user may not change their profile information`,
				);
			}
		}

		await this.externalHooks.run('user.profile.beforeUpdate', [userId, currentEmail, payload]);

		const preUpdatePerson = await this.personRepository.findById(userId);
		if (!preUpdatePerson) throw new NotFoundError('User not found');
		await this.userService.update(userId, payload);
		const user = await this.userService.findUserWithAuthIdentities(userId);

		this.logger.info('User updated successfully', { userId });

		const changeableFields = ['firstName', 'lastName'] as const;
		const fieldsChanged = changeableFields.filter(
			(key) => key in payload && payload[key] !== preUpdatePerson[key],
		);

		this.eventService.emit('user-updated', { user, fieldsChanged });

		const publicUser = await this.userService.toPublic(user);

		await this.externalHooks.run('user.profile.update', [currentEmail, publicUser]);

		return publicUser;
	}

	private isUserManagedByEnv(user: User): boolean {
		const { instanceSettingsLoader } = this.globalConfig;
		return (
			instanceSettingsLoader.ownerManagedByEnv &&
			!!user.email &&
			user.email.toLowerCase() === instanceSettingsLoader.ownerEmail.toLowerCase()
		);
	}

	private isAuthIdentityActive(authIdentity: AuthIdentity) {
		return authIdentity.providerType === getCurrentAuthenticationMethod();
	}

	/**
	 * Update the logged-in user's password.
	 */
	@Patch('/password', {
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async updatePassword(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: PasswordUpdateRequestDto,
	) {
		const { currentPassword, newPassword, mfaCode } = payload;

		if (!isPerson(req.user)) {
			throw new ForbiddenError('Only a person can change their password');
		}
		const person = req.user;

		if (this.isUserManagedByEnv(person)) {
			throw new ForbiddenError(
				'This account is managed via environment variables and cannot be modified through the API',
			);
		}

		// If SAML is enabled, we don't allow the user to change their password
		if (isSamlLicensedAndEnabled()) {
			this.logger.debug('Attempted to change password for user, while SAML is enabled', {
				userId: person.id,
			});
			throw new BadRequestError(
				'With SAML enabled, users need to use their SAML provider to change passwords',
			);
		}

		if (!person.password) {
			throw new BadRequestError('Requesting user not set up.');
		}

		const isCurrentPwCorrect = await this.passwordUtility.compare(currentPassword, person.password);
		if (!isCurrentPwCorrect) {
			throw new BadRequestError('Provided current password is incorrect.');
		}

		const passwordValidation = createPasswordSchema(
			this.globalConfig.userManagement.password.minLength,
		).safeParse(newPassword);
		if (!passwordValidation.success) {
			throw new BadRequestError(
				passwordValidation.error.errors.map(({ message }) => message).join(' '),
			);
		}

		if (person.mfaEnabled) {
			if (typeof mfaCode !== 'string') {
				throw new BadRequestError('Two-factor code is required to change password.');
			}

			const isMfaCodeValid = await this.mfaService.validateMfa(person.id, mfaCode, undefined);
			if (!isMfaCodeValid) {
				throw new InvalidMfaCodeError();
			}
		}

		person.password = await this.passwordUtility.hash(newPassword);

		const updatedPerson = await this.personRepository.save(person);
		this.logger.info('Password updated successfully', { userId: person.id });

		this.authService.issueCookie(res, updatedPerson, req.authInfo?.usedMfa ?? false, req.browserId);

		this.eventService.emit('user-updated', { user: updatedPerson, fieldsChanged: ['password'] });

		await this.externalHooks.run('user.password.update', [
			updatedPerson.email,
			updatedPerson.password,
		]);

		return { success: true };
	}

	/**
	 * Store the logged-in user's survey answers.
	 */
	@Post('/survey')
	async storeSurveyAnswers(req: MeRequest.SurveyAnswers) {
		if (!isPerson(req.user)) {
			throw new ForbiddenError('Only a person can submit the survey');
		}

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

		await this.personRepository.saveSurveyAnswers(req.user.id, validatedAnswers);

		this.logger.info('User survey updated successfully', { userId: req.user.id });

		this.eventService.emit('user-submitted-personalization-survey', {
			userId: req.user.id,
			answers: validatedAnswers,
		});

		return { success: true };
	}

	/**
	 * Update the logged-in user's settings.
	 * Note: This endpoint uses UserSelfSettingsUpdateRequestDto which excludes admin-only
	 * fields like allowSSOManualLogin to prevent privilege escalation attacks (SSO bypass).
	 */
	@Patch('/settings')
	async updateCurrentUserSettings(
		req: AuthenticatedRequest,
		_: Response,
		@Body payload: UserSelfSettingsUpdateRequestDto,
	): Promise<User['settings']> {
		const { id } = req.user;

		await this.userService.updateSettings(id, payload);

		const user = await this.userRepository.findOneOrFail({
			// TypeORM needs `id` here because `ServiceAccount.details` is an eager join.
			select: ['id', 'settings'],
			where: { id },
		});

		return user.settings;
	}
}
