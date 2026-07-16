import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';
import { OAuthHelpers } from './oauth.helpers';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { UrlService } from '@/services/url.service';

type ConsentDetailsResult =
	| {
			ok: true;
			clientName: string;
			clientId: string;
			resourceName?: string;
			redirectUri?: string;
			/**
			 * Scopes the user can grant. The client's requested scopes act as a
			 * ceiling: when the client asked for specific scopes, only those are
			 * grantable. Empty = full user delegation (no picker).
			 */
			scopes: string[];
			/** Scopes this user granted to this client last time, to preselect in the picker. */
			previousScopes?: string[];
			/** Tool names each scope unlocks, shown per scope group in the picker. */
			scopeTools?: Record<string, string[]>;
	  }
	| { ok: false; reason: 'resource_unavailable' }
	| { ok: false; reason: 'forbidden' };

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
	async getConsentDetails(sessionToken: string, user: User): Promise<ConsentDetailsResult | null> {
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

				if (!(await resource.authorize(user)))
					return {
						ok: false,
						reason: 'forbidden',
					};

				const scopes = this.grantableScopes(resource.scopes, sessionPayload.requestedScopes);

				return {
					ok: true,
					clientName: client.name,
					clientId: client.id,
					resourceName: resource.displayName,
					redirectUri: sessionPayload.redirectUri,
					scopes,
					previousScopes: await this.previousScopes(user.id, client.id, scopes),
					scopeTools: resource.getScopeTools?.(),
				};
			}

			const defaultResource = this.protectedResourceRegistry.getDefaultResource();
			const scopes = this.grantableScopes(
				defaultResource?.scopes ?? [],
				sessionPayload.requestedScopes,
			);

			return {
				ok: true,
				clientName: client.name,
				clientId: client.id,
				redirectUri: sessionPayload.redirectUri,
				scopes,
				previousScopes: await this.previousScopes(user.id, client.id, scopes),
				scopeTools: defaultResource?.getScopeTools?.(),
			};
		} catch (error) {
			this.logger.error('Error getting consent details', { error });
			return null;
		}
	}

	/**
	 * The client's requested scopes are a ceiling: the user may narrow a grant
	 * but never widen it beyond what the client asked for.
	 */
	private grantableScopes(supportedScopes: string[], requestedScopes?: string[]): string[] {
		if (!requestedScopes || requestedScopes.length === 0) return supportedScopes;
		return supportedScopes.filter((scope) => requestedScopes.includes(scope));
	}

	/**
	 * Scopes this user granted to this client on a previous consent, limited to
	 * what is grantable now — used to preselect the picker so re-consent
	 * respects the user's earlier decision.
	 */
	private async previousScopes(
		userId: string,
		clientId: string,
		grantableScopes: string[],
	): Promise<string[] | undefined> {
		if (grantableScopes.length === 0) return undefined;

		const consent = await this.userConsentRepository.findOneBy({ userId, clientId });
		if (!consent?.scope) return undefined;

		const previous = consent.scope.filter((scope) => grantableScopes.includes(scope));
		return previous.length > 0 ? previous : undefined;
	}

	/**
	 * Handle consent approval/denial
	 * Uses JWT session token instead of database lookup
	 */
	async handleConsentDecision(
		sessionToken: string,
		user: User,
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
				userId: user.id,
			});

			return { redirectUrl };
		}

		if (sessionPayload.resource) {
			const resource = await this.protectedResourceRegistry.getByResourceUrl(
				sessionPayload.resource,
			);

			if (!resource) {
				throw new UserError('Resource is not available for the requested authorization');
			}

			if (!(await resource.authorize(user))) {
				this.logger.warn('User is not authorized for the requested resource', {
					clientId: sessionPayload.clientId,
					userId: user.id,
					resourceUrl: sessionPayload.resource,
				});
				throw new ForbiddenError('User is not authorized for the requested resource');
			}
		}

		const grantedScopes = await this.resolveGrantedScopes(sessionPayload, scopes);

		await this.userConsentRepository.upsert(
			{
				userId: user.id,
				clientId: sessionPayload.clientId,
				grantedAt: Date.now(),
				scope: grantedScopes,
			},
			['userId', 'clientId'],
		);

		const code = await this.authorizationCodeService.createAuthorizationCode(
			sessionPayload.clientId,
			user.id,
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
			userId: user.id,
		});

		return { redirectUrl: successRedirectUrl };
	}

	/**
	 * Validates the user's scope selection against the target resource. Resources
	 * without grantable scopes (e.g. per-workflow MCP triggers) always grant `[]`
	 * — full delegation scoped to that resource. Otherwise the selection must be
	 * a non-empty subset of the grantable scopes: the resource's supported
	 * scopes, capped by the client's requested scopes.
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

		const grantable = this.grantableScopes(supportedScopes, sessionPayload.requestedScopes);
		const ungrantable = scopes.filter((scope) => !grantable.includes(scope));
		if (ungrantable.length > 0) {
			throw new UserError(`Scopes cannot be granted: ${ungrantable.join(', ')}`);
		}

		return scopes;
	}
}
