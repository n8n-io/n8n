import {
	ChangeEmailRequestDto,
	ConfirmEmailChangeRequestDto,
	ResolveChangeEmailTokenQueryDto,
	type ChangeEmailResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest, UserRepository } from '@n8n/db';
import {
	Body,
	createUserKeyedRateLimiter,
	Get,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { AuthlessRequest } from '@/requests';
import { EmailChangeService } from '@/services/email-change.service';
import { UserService } from '@/services/user.service';
import { UserManagementMailer } from '@/user-management/email';

@RestController()
export class ChangeEmailController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly userRepository: UserRepository,
		private readonly mailer: UserManagementMailer,
		private readonly emailChangeService: EmailChangeService,
		private readonly eventService: EventService,
	) {}

	/**
	 * Request an email change. Re-authenticates the user, then either sends a
	 * confirmation link to the current email (when SMTP is set up) or applies the
	 * change immediately (fallback when no email delivery is configured).
	 */
	@Post('/change-email', {
		keyedRateLimit: createUserKeyedRateLimiter({}),
	})
	async requestEmailChange(
		req: AuthenticatedRequest,
		res: Response,
		@Body payload: ChangeEmailRequestDto,
	): Promise<ChangeEmailResponse> {
		const { user } = req;
		const currentEmail = user.email;
		const newEmail = payload.email;

		if (newEmail === currentEmail) {
			throw new BadRequestError('The new email address matches the current one');
		}

		await this.emailChangeService.assertMayRequestEmailChange(user, {
			currentPassword: payload.currentPassword,
			mfaCode: payload.mfaCode,
		});

		await this.assertEmailAvailable(newEmail);

		// Fallback: without email delivery the confirmation cannot be sent, so apply
		// the change immediately (preserves the pre-existing self-hosted behavior).
		if (!this.mailer.isEmailSetUp) {
			const publicUser = await this.applyEmailChange(user.id, currentEmail, newEmail);
			this.authService.issueCookie(
				res,
				await this.userService.findUserWithAuthIdentities(user.id),
				req.authInfo?.usedMfa ?? false,
				req.browserId,
			);
			return { status: 'changed', user: publicUser };
		}

		const confirmationUrl = this.authService.generateEmailChangeUrl(user, newEmail);

		// Fail closed: a send failure must leave the email unchanged, so rethrow.
		try {
			await this.mailer.emailChangeConfirmation({
				email: currentEmail,
				firstName: user.firstName,
				newEmail,
				confirmationUrl,
			});
		} catch (error) {
			this.eventService.emit('email-failed', {
				user,
				messageType: 'Email change confirmation',
				publicApi: false,
			});
			if (error instanceof Error) {
				throw new InternalServerError(`Please contact your administrator: ${error.message}`, error);
			}
			throw error;
		}

		this.logger.info('Sent email change confirmation successfully', { userId: user.id });
		this.eventService.emit('user-transactional-email-sent', {
			userId: user.id,
			messageType: 'Email change confirmation',
			publicApi: false,
		});

		return { status: 'confirmation-sent' };
	}

	/**
	 * Verify an email change token and return the target email for the confirm page.
	 */
	@Get('/resolve-change-email-token', { skipAuth: true, ipRateLimit: true })
	async resolveChangeEmailToken(
		_req: AuthlessRequest,
		_res: Response,
		@Query payload: ResolveChangeEmailTokenQueryDto,
	): Promise<{ email: string }> {
		const resolved = await this.authService.resolveEmailChangeToken(payload.token);
		if (!resolved) throw new NotFoundError('');

		return { email: resolved.newEmail };
	}

	/**
	 * Confirm an email change from the token sent to the current email. Applies the
	 * change, notifies the old address, and issues no session cookie.
	 */
	@Post('/confirm-email-change', { skipAuth: true, ipRateLimit: true })
	async confirmEmailChange(
		_req: AuthlessRequest,
		_res: Response,
		@Body payload: ConfirmEmailChangeRequestDto,
	): Promise<{ success: true }> {
		const resolved = await this.authService.resolveEmailChangeToken(payload.token);
		if (!resolved) throw new NotFoundError('');

		const { user, newEmail } = resolved;
		const oldEmail = user.email;

		// Re-run the guards: a token minted before the instance state changed
		// (SAML/SSO enabled, account became env-managed) must not slip through.
		await this.emailChangeService.assertMayApplyEmailChange(user);

		await this.assertEmailAvailable(newEmail);

		await this.applyEmailChange(user.id, oldEmail, newEmail);

		await this.mailer.emailChangeCompleted({
			email: oldEmail,
			firstName: user.firstName,
			newEmail,
		});

		this.logger.info('Email change confirmed successfully', { userId: user.id });

		return { success: true };
	}

	/** Reject when another user already owns the target email. */
	private async assertEmailAvailable(email: string): Promise<void> {
		const existing = await this.userRepository.findOneBy({ email });
		if (existing) {
			throw new BadRequestError('This email address is already in use');
		}
	}

	/** Persist the new email, emit the event, and run the profile hooks. */
	private async applyEmailChange(userId: string, oldEmail: string, newEmail: string) {
		// Reject a stale change before the side-effecting hook, so a hook does not
		// run for a change that will not apply. `changeEmail` below stays the
		// authoritative guard for the concurrent race after this check.
		const current = await this.userRepository.findOneBy({ id: userId });
		if (!current || current.email !== oldEmail) throw new NotFoundError('');

		await this.externalHooks.run('user.profile.beforeUpdate', [
			userId,
			oldEmail,
			{ email: newEmail },
		]);

		// Reject the token when the email changed since the token was resolved, so
		// a concurrent change is not overwritten.
		const result = await this.userRepository.changeEmail(userId, oldEmail, newEmail);
		if (result === 'stale') throw new NotFoundError('');
		if (result === 'email-taken') {
			throw new BadRequestError('This email address is already in use');
		}

		const user = await this.userService.findUserWithAuthIdentities(userId);

		this.eventService.emit('user-updated', { user, fieldsChanged: ['email'] });

		const publicUser = await this.userService.toPublic(user);
		await this.externalHooks.run('user.profile.update', [oldEmail, publicUser]);

		return publicUser;
	}
}
