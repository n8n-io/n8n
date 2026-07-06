import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';
import { OAuthHelpers } from './oauth.helpers';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

type ConsentDetailsResult =
	| {
			ok: true;
			clientName: string;
			clientId: string;
			resourceName?: string;
			redirectUri?: string;
			/** Scopes the user can grant for the target resource. Empty = full user delegation (no picker). */
			scopes: string[];
			/** Scopes the client asked for, to preselect in the picker. */
			requestedScopes?: string[];
	  }
	| { ok: false; reason: 'resource_unavailable' };

/**
 * Manages the consent flow for the shared OAuth server.
 * Handles user authorization decisions and generates authorization codes
 */
@Service()
export class OAuthConsentService {
	constructor(
		private readonly logger: Logger,
		private readonly oauthSessionService: OAuthSessionService,
		private readonly oauthClientRepository: OAuthClientRepository,
		private readonly userConsentRepository: UserConsentRepository,
		private readonly authorizationCodeService: OAuthAuthorizationCodeService,
		private readonly protectedResourceRegistry: ProtectedResourceRegistry,
		private readonly urlService: UrlService,
	) {}

	/**
	 * Get consent details from session cookie
	 * Verifies JWT session token and returns client information
	 */
	async getConsentDetails(sessionToken: string): Promise<ConsentDetailsResult | null> {
		try {
			const sessionPayload = this.oauthSessionService.verifySession(sessionToken);

			const client = await this.oauthClientRepository.findOne({
				where: { id: sessionPayload.clientId },
			});

			if (!client) {
				return null;
			}

			if (sessionPayload.resource) {
				const resource = await this.protectedResourceRegistry.getByResourceUrl(
					sessionPayload.resource,
				);

				if (!resource) {
					return { ok: false, reason: 'resource_unavailable' };
				}

				return {
					ok: true,
					clientName: client.name,
					clientId: client.id,
					resourceName: resource.displayName,
					redirectUri: sessionPayload.redirectUri,
					scopes: resource.scopes,
					requestedScopes: sessionPayload.requestedScopes,
				};
			}

			return {
				ok: true,
				clientName: client.name,
				clientId: client.id,
				redirectUri: sessionPayload.redirectUri,
				scopes: this.protectedResourceRegistry.getDefaultResource()?.scopes ?? [],
				requestedScopes: sessionPayload.requestedScopes,
			};
		} catch (error) {
			this.logger.error('Error getting consent details', { error });
			return null;
		}
	}

	/**
	 * Handle consent approval/denial
	 * Uses JWT session token instead of database lookup
	 */
	async handleConsentDecision(
		sessionToken: string,
		userId: string,
		approved: boolean,
		scopes?: string[],
	): Promise<{ redirectUrl: string }> {
		let sessionPayload: OAuthSessionPayload;
		try {
			sessionPayload = this.oauthSessionService.verifySession(sessionToken);
		} catch (error) {
			throw new UserError('Invalid or expired session');
		}

		const issuer = this.urlService.getInstanceBaseUrl();

		if (!approved) {
			const redirectUrl = OAuthHelpers.buildErrorRedirectUrl(
				sessionPayload.redirectUri,
				'access_denied',
				'User denied the authorization request',
				sessionPayload.state,
				issuer,
			);

			this.logger.info('Consent denied', {
				clientId: sessionPayload.clientId,
				userId,
			});

			return { redirectUrl };
		}

		const grantedScopes = await this.resolveGrantedScopes(sessionPayload, scopes);

		await this.userConsentRepository.upsert(
			{
				userId,
				clientId: sessionPayload.clientId,
				grantedAt: Date.now(),
				scope: grantedScopes,
			},
			['userId', 'clientId'],
		);

		const code = await this.authorizationCodeService.createAuthorizationCode(
			sessionPayload.clientId,
			userId,
			sessionPayload.redirectUri,
			sessionPayload.codeChallenge,
			sessionPayload.state,
			sessionPayload.resource,
			grantedScopes,
		);

		const successRedirectUrl = OAuthHelpers.buildSuccessRedirectUrl(
			sessionPayload.redirectUri,
			code,
			sessionPayload.state,
			issuer,
		);

		this.logger.info('Consent approved', {
			clientId: sessionPayload.clientId,
			userId,
		});

		return { redirectUrl: successRedirectUrl };
	}

	/**
	 * Validates the user's scope selection against the target resource. Resources
	 * without grantable scopes (e.g. per-workflow MCP triggers) always grant `[]`
	 * — full delegation scoped to that resource. Otherwise the selection must be
	 * a non-empty subset of the resource's supported scopes.
	 */
	private async resolveGrantedScopes(
		sessionPayload: OAuthSessionPayload,
		scopes: string[] | undefined,
	): Promise<string[]> {
		const resource = sessionPayload.resource
			? await this.protectedResourceRegistry.getByResourceUrl(sessionPayload.resource)
			: this.protectedResourceRegistry.getDefaultResource();

		const supportedScopes = resource?.scopes ?? [];
		if (supportedScopes.length === 0) {
			return [];
		}

		if (!scopes || scopes.length === 0) {
			throw new UserError('At least one scope must be granted');
		}

		const unsupported = scopes.filter((scope) => !supportedScopes.includes(scope));
		if (unsupported.length > 0) {
			throw new UserError(`Unsupported scopes: ${unsupported.join(', ')}`);
		}

		return scopes;
	}
}
