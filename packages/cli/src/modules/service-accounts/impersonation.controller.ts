import { impersonationActorSchema, StartImpersonationRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { AuthenticatedRequest, UserRepository } from '@n8n/db';
import { Body, Delete, GlobalScope, Post, RestController } from '@n8n/decorators';
import { GLOBAL_CHAT_USER_ROLE_SLUG, GLOBAL_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { getActor } from '@/auth/impersonation';
import { assertNotServiceAccount } from '@/auth/service-account.guard';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import { UserService } from '@/services/user.service';

@RestController('/impersonation')
export class ImpersonationController {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly userRepository: UserRepository,
		private readonly userService: UserService,
		private readonly eventService: EventService,
	) {}

	@Post('/')
	@GlobalScope('serviceAccount:impersonate')
	async start(req: AuthenticatedRequest, res: Response, @Body dto: StartImpersonationRequestDto) {
		const { serviceAccountId } = dto;

		// Scopes alone don't stop SA→SA impersonation: an admin-roled service account
		// inherits `serviceAccount:impersonate`. This is one of the two hard guards
		// (the other is in `AuthService.validateImpersonationActor`).
		assertNotServiceAccount(req.user, 'impersonate service accounts');

		if (getActor(req)) {
			throw new BadRequestError('Already acting as a service account');
		}

		const serviceAccount = await this.userRepository.findOne({
			where: { id: serviceAccountId, type: 'serviceAccount' },
			relations: ['role'],
		});

		// 404 rather than 403 for a non-SA id, so this isn't a user-id existence oracle.
		if (!serviceAccount) throw new NotFoundError('Service account not found');

		if (serviceAccount.disabled) {
			throw new ForbiddenError('This service account is disabled');
		}

		if (
			serviceAccount.role.slug === GLOBAL_OWNER_ROLE_SLUG ||
			serviceAccount.role.slug === GLOBAL_CHAT_USER_ROLE_SLUG
		) {
			throw new ForbiddenError('This service account cannot be acted as');
		}

		const usedMfa = req.authInfo?.usedMfa ?? false;

		// Don't let impersonation launder a non-MFA session into one: an operator with
		// MFA enabled must have used it, or `checkMfaGate` would be satisfied by a
		// session that never presented a second factor.
		if (req.user.mfaEnabled && !usedMfa) {
			throw new ForbiddenError('Two-factor authentication is required to act as a service account');
		}

		const actor = req.user;

		// Retire the operator's own cookie so it can't be replayed alongside the
		// impersonation cookie.
		await this.authService.invalidateToken(req);

		this.authService.issueCookie(
			res,
			serviceAccount,
			// Carry the operator's real `usedMfa`. Never hard-code `true`.
			usedMfa,
			req.browserId,
			undefined,
			undefined,
			{ actor, isImpersonationTransition: true },
		);

		this.logger.info('Started acting as service account', {
			actorId: actor.id,
			serviceAccountId: serviceAccount.id,
		});

		this.eventService.emit('service-account-impersonation-started', {
			userId: actor.id,
			serviceAccountId: serviceAccount.id,
		});

		return {
			...(await this.userService.toPublic(serviceAccount, { withScopes: true })),
			impersonating: true,
			actor: impersonationActorSchema.parse(actor),
		};
	}

	/**
	 * Stop acting as a service account and restore the operator's session.
	 *
	 * Deliberately **no `@GlobalScope`**: during impersonation `req.user` is the
	 * service account, which does not hold `serviceAccount:impersonate`, so gating
	 * exit on that scope would trap the operator inside the SA with no way out.
	 * Authorization is the presence of a valid, signature-verified `act` claim —
	 * `AuthService.validateImpersonationActor` has already confirmed the actor
	 * exists, is enabled, is human, still holds the impersonate scope, and matches
	 * the hash bound at issue time. Nothing further to check.
	 */
	@Delete('/')
	async stop(req: AuthenticatedRequest, res: Response) {
		const actor = getActor(req);
		if (!actor) throw new BadRequestError('Not currently acting as a service account');

		const serviceAccountId = req.user.id;
		const usedMfa = req.authInfo?.usedMfa ?? false;

		await this.authService.invalidateToken(req);

		// Re-read rather than trusting the middleware's copy: the operator may have
		// been disabled or deleted during the session.
		const restoredActor: User | null = await this.userRepository.findOne({
			where: { id: actor.id },
			relations: ['role'],
		});

		if (!restoredActor || restoredActor.disabled) {
			this.authService.clearCookie(res);
			res.status(401);
			return { status: 'error', message: 'Unauthorized' };
		}

		this.authService.issueCookie(res, restoredActor, usedMfa, req.browserId, undefined, undefined, {
			// Without the nonce this re-mints the exact token that entering
			// impersonation revoked, whenever both happen within the same second.
			isImpersonationTransition: true,
		});

		this.logger.info('Stopped acting as service account', {
			actorId: restoredActor.id,
			serviceAccountId,
		});

		this.eventService.emit('service-account-impersonation-ended', {
			userId: restoredActor.id,
			serviceAccountId,
		});

		return {
			...(await this.userService.toPublic(restoredActor, { withScopes: true })),
			impersonating: false,
		};
	}
}
