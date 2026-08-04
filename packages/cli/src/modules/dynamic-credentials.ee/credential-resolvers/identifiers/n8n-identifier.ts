import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ICredentialContext } from 'n8n-workflow';
import { ITokenIdentifier } from './identifier-interface';
import { AuthService } from '@/auth/auth.service';
import { z } from 'zod';
import { CredentialResolverError } from '@n8n/decorators';
import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import { AccessService } from '@/services/access.service';

import { RunnerBindingService } from './runner-binding.service';
import {
	SCHEDULED_TRIGGER_SOURCE,
	ScheduledTriggerIdentityService,
} from './scheduled-trigger-identity';

const ManualExecutionMetadataSchema = z.object({
	source: z.literal('manual-execution'),
});

const RequestBoundMetadataSchema = z.object({
	source: z.enum(['chat-hub-injected', 'cookie-source']),
	method: z.string(),
	endpoint: z.string(),
	browserId: z.string().optional(),
});

const N8nOAuthMetadataSchema = z.object({
	source: z.literal('n8n-oauth'),
	resource: z.string(),
});

const ScheduledTriggerMetadataSchema = z.object({
	source: z.literal(SCHEDULED_TRIGGER_SOURCE),
});

const N8NIdentifierMetadataSchema = z.discriminatedUnion('source', [
	ManualExecutionMetadataSchema,
	RequestBoundMetadataSchema,
	N8nOAuthMetadataSchema,
	ScheduledTriggerMetadataSchema,
]);

/**
 * N8N JWT token identifier.
 * Validates n8n authentication tokens and resolves them to user IDs.
 * Used by the N8N credential resolver to authenticate users via n8n's
 * built-in JWT authentication and store credentials per user.
 *
 * Supports two metadata shapes, discriminated by `source`:
 * - `manual-execution`: editor-triggered run; identity is the n8n auth cookie (JWT).
 *   Validated cryptographically without request-bound checks (browserId / endpoint).
 * - `chat-hub-injected` / `cookie-source`: request-bound run (chat-hub or
 *   web/cookie-based dynamic-credential resolution); identity is the n8n auth
 *   cookie captured from the HTTP request, validated with full request context
 *   (method, endpoint, browserId).
 * - `scheduled-trigger`: unattended run started for a user on their schedule;
 *   identity is a token this instance minted, so the authorization a live
 *   session would have carried has to be re-established here instead.
 */
@Service()
export class N8NIdentifier implements ITokenIdentifier {
	constructor(
		private readonly authService: AuthService,
		private readonly oauthTokenVerifierProxy: OAuthTokenVerifierProxy,
		private readonly scheduledTriggerIdentityService: ScheduledTriggerIdentityService,
		private readonly runnerBindingService: RunnerBindingService,
		private readonly userRepository: UserRepository,
		private readonly accessService: AccessService,
	) {}

	async validateOptions(_: Record<string, unknown>): Promise<void> {
		return;
	}

	async resolve(context: ICredentialContext, _: Record<string, unknown>): Promise<string> {
		const metadataResult = N8NIdentifierMetadataSchema.safeParse(context.metadata);
		if (!metadataResult.success) {
			throw new CredentialResolverError(
				`Invalid context metadata: ${metadataResult.error.message}`,
			);
		}

		if (metadataResult.data.source === 'manual-execution') {
			// No HTTP request context at credential-resolution time; skip browserId/endpoint checks.
			const user = await this.authService.authenticateUserByCookie(context.identity);
			return user.id;
		}

		if (metadataResult.data.source === SCHEDULED_TRIGGER_SOURCE) {
			return await this.resolveScheduledTrigger(context.identity);
		}

		if (metadataResult.data.source === 'n8n-oauth') {
			const user = await this.oauthTokenVerifierProxy.verifyOAuthAccessToken(
				context.identity,
				metadataResult.data.resource,
			);
			if (!user?.user) {
				throw new CredentialResolverError(
					`Invalid OAuth token for resource ${metadataResult.data.resource}`,
				);
			}
			return user.user.id;
		}

		// Chat-hub / webhook run: validate the JWT together with the request-bound metadata
		// (browserId, endpoint, method) captured from the originating HTTP request.
		const user = await this.authService.authenticateUserBasedOnToken(
			context.identity,
			metadataResult.data.method,
			metadataResult.data.endpoint,
			metadataResult.data.browserId,
		);
		return user.id;
	}

	/**
	 * A session proves the user is still allowed to act as it is validated; a
	 * minted token proves only who was named when it was issued. Everything that
	 * can have changed between the grant and this run is therefore re-checked,
	 * cheapest first.
	 */
	private async resolveScheduledTrigger(token: string): Promise<string> {
		let payload;
		try {
			payload = this.scheduledTriggerIdentityService.verifyToken(token);
		} catch {
			// The underlying reason (bad signature, expiry, wrong shape) stays out of
			// the message: the caller cannot act on the difference.
			throw new CredentialResolverError('Invalid or expired runner token');
		}

		const { userId, workflowId } = payload;

		const user = await this.userRepository.findOne({ where: { id: userId } });
		if (!user || user.disabled) {
			throw new CredentialResolverError('Runner token names a user that can no longer run');
		}

		if (!(await this.runnerBindingService.isActive(workflowId, userId))) {
			throw new CredentialResolverError('No active binding for this workflow and user');
		}

		// Revoking project access never touches the binding, so this is the only
		// check that catches a user who was removed from the project after granting.
		if (!(await this.accessService.hasExecuteAccess(userId, workflowId))) {
			throw new CredentialResolverError('User may no longer execute this workflow');
		}

		return userId;
	}
}
