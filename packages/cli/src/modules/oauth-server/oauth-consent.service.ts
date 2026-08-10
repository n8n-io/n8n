import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuth2FlowService } from './oauth-flow.service';
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
			/**
			 * The user already granted this exact consent and a human navigated here, so
			 * the screen has nothing new to ask: the caller may approve without rendering
			 * it. See {@link OAuthConsentService.mayApproveSilently}.
			 */
			silentApproval?: boolean;
	  }
	| { ok: false; reason: 'resource_unavailable' }
	| { ok: false; reason: 'forbidden' };

/**
 * How long a consent keeps letting a first-party flow through without re-prompting.
 * A grant on a first-party trigger is invisible in the connected-clients list (it
 * filters to `isFirstParty: false`), so it must lapse on its own rather than
 * becoming a permanent silent permission the user can't find.
 */
const SILENT_APPROVAL_MAX_AGE_MS = 30 * Time.days.toMilliseconds;

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
		private readonly oauth2FlowService: OAuth2FlowService,
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
					// Only present when it applies, so a third-party client's payload — and the
					// shape every existing caller asserts on — is untouched.
					...((await this.mayApproveSilently(sessionPayload, user, resource, scopes)) && {
						silentApproval: true,
					}),
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
	 * Whether this flow may complete without showing the consent screen.
	 *
	 * A first-party trigger (form, webhook) re-runs the whole authorization flow on
	 * every visit, so without this the user re-approves the same thing on every
	 * click. These resources also grant no scopes, which makes the screen a pure
	 * "did you mean to do this?" interstitial rather than a permission grant — and
	 * that question is worth asking once, not every time.
	 *
	 * All five conditions must hold:
	 * 1. **First-party resource.** A registered third-party client always prompts.
	 * 2. **A prior consent exists** for this (user, client).
	 * 3. **Nothing new is being asked**: everything grantable now was granted then,
	 *    so any future scope addition re-prompts on its own.
	 * 4. **The grant is still fresh** ({@link SILENT_APPROVAL_MAX_AGE_MS}).
	 * 5. **A human navigated here.** The consent screen is what currently stops a
	 *    cross-site page from scripting a navigation to a trigger URL and running a
	 *    workflow as whoever is logged in — `n8n-auth` is `SameSite=Lax`, so the
	 *    session rides along on top-level cross-site GETs. Skipping the screen
	 *    therefore requires the flow to have started from a real user navigation
	 *    (see `classifyNavigationIntent`). Anything else — including a client that
	 *    sends no fetch metadata — still gets the screen.
	 */
	private async mayApproveSilently(
		sessionPayload: OAuthSessionPayload,
		user: User,
		resource: { isFirstParty?: boolean },
		grantableScopes: string[],
	): Promise<boolean> {
		if (!resource.isFirstParty || !sessionPayload.state) return false;

		const intent = await this.oauth2FlowService.getNavigationIntent(sessionPayload.state);
		if (intent !== 'user-navigation') return false;

		const consent = await this.userConsentRepository.findOneBy({
			userId: user.id,
			clientId: sessionPayload.clientId,
		});
		if (!consent) return false;

		const granted = consent.scope ?? [];
		if (!grantableScopes.every((scope) => granted.includes(scope))) return false;

		// `grantedAt` is a bigint column, so it can surface as a string.
		return Date.now() - Number(consent.grantedAt) <= SILENT_APPROVAL_MAX_AGE_MS;
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
