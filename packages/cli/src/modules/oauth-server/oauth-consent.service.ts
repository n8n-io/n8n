import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { getAuthPrincipalScopes } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from './oauth-authorization-code.service';
import { OAuthSessionService, type OAuthSessionPayload } from './oauth-session.service';
import { OAuthHelpers } from './oauth.helpers';
import { MCP_TOOL_SCOPES, N8N_OAUTH_SCOPES } from '@/modules/mcp/mcp-protected-resource';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

type ConsentDetailsResult =
	| { ok: true; clientName: string; clientId: string; resourceName?: string; scopes: string[] }
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
		private readonly projectRepository: ProjectRepository,
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

			// Mirror the grant default: a client that requests no scopes (e.g. the regular MCP
			// flow) still receives — and must consent to — the MCP tool scopes.
			const scopes = sessionPayload.scopes ?? MCP_TOOL_SCOPES;

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
					scopes,
				};
			}

			return {
				ok: true,
				clientName: client.name,
				clientId: client.id,
				scopes,
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
		user: User,
		approved: boolean,
	): Promise<{ redirectUrl: string }> {
		let sessionPayload: OAuthSessionPayload;
		try {
			sessionPayload = this.oauthSessionService.verifySession(sessionToken);
		} catch (error) {
			throw new UserError('Invalid or expired session');
		}

		if (!approved) {
			const redirectUrl = OAuthHelpers.buildErrorRedirectUrl(
				sessionPayload.redirectUri,
				'access_denied',
				'User denied the authorization request',
				sessionPayload.state,
			);

			this.logger.info('Consent denied', {
				clientId: sessionPayload.clientId,
				userId: user.id,
			});

			return { redirectUrl };
		}

		const grantedScopes = await this.resolveGrantedScopes(user, sessionPayload.scopes);

		await this.userConsentRepository.upsert(
			{
				userId: user.id,
				clientId: sessionPayload.clientId,
				grantedAt: Date.now(),
			},
			['userId', 'clientId'],
		);

		const code = await this.authorizationCodeService.createAuthorizationCode(
			sessionPayload.clientId,
			user.id,
			sessionPayload.redirectUri,
			sessionPayload.codeChallenge,
			sessionPayload.state,
			grantedScopes,
			sessionPayload.resource,
		);

		const successRedirectUrl = OAuthHelpers.buildSuccessRedirectUrl(
			sessionPayload.redirectUri,
			code,
			sessionPayload.state,
		);

		this.logger.info('Consent approved', {
			clientId: sessionPayload.clientId,
			userId: user.id,
			grantedScopes,
		});

		return { redirectUrl: successRedirectUrl };
	}

	/**
	 * Downscope the requested scopes to what the user may actually grant:
	 * - n8n RBAC scopes are kept only if the user holds them globally or in any project;
	 * - non-RBAC scopes (e.g. MCP `tool:*`) pass through unchanged;
	 * - when no scopes were requested, fall back to the MCP tool scopes (legacy default).
	 *
	 * This bounds the persisted grant; request-time enforcement re-checks the live permission.
	 */
	private async resolveGrantedScopes(
		user: User,
		requestedScopes: string[] | undefined,
	): Promise<string[]> {
		const requested = requestedScopes ?? MCP_TOOL_SCOPES;

		if (!requested.some((scope) => N8N_OAUTH_SCOPES.includes(scope))) {
			return requested;
		}

		const userScopes = await this.getEffectiveUserScopes(user);
		return requested.filter((scope) => !N8N_OAUTH_SCOPES.includes(scope) || userScopes.has(scope));
	}

	/** All scope slugs the user holds — from their global role and any project membership role. */
	private async getEffectiveUserScopes(user: User): Promise<Set<string>> {
		const globalScopes = getAuthPrincipalScopes(user);

		const projectScopeRows = await this.projectRepository
			.createQueryBuilder('project')
			.innerJoin('project.projectRelations', 'relation')
			.innerJoin('relation.role', 'role')
			.innerJoin('role.scopes', 'scope')
			.where('relation.userId = :userId', { userId: user.id })
			.select('scope.slug', 'slug')
			.distinct(true)
			.getRawMany<{ slug: string }>();

		return new Set<string>([...globalScopes, ...projectScopeRows.map((row) => row.slug)]);
	}
}
