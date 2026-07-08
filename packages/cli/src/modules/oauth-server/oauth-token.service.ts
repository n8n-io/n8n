import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { UserRepository, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { MoreThanOrEqual } from '@n8n/typeorm';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError } from 'n8n-workflow';
import { randomBytes, randomUUID } from 'node:crypto';

import { AccessToken } from './database/entities/oauth-access-token.entity';
import { RefreshToken } from './database/entities/oauth-refresh-token.entity';
import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from './database/repositories/oauth-refresh-token.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { AccessTokenNotFoundError, JWTVerificationError } from './oauth.errors';

import { JwtService } from '@/services/jwt.service';
import type {
	OAuthTokenVerifier,
	UserWithContext,
} from '@/services/oauth-token-verifier-proxy.service';

/**
 * Backfill value written to the `scope` column by migration 1784000000026 for
 * grants that predate scoping. No runtime code ever wrote this value, so it
 * provably identifies a grant made under the old full-delegation contract and
 * is substituted with the resource's full scope set on rotation.
 */
const PRE_SCOPING_SENTINEL = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

/**
 * Manages the OAuth 2.1 token lifecycle for the shared OAuth server.
 * Generates, validates, rotates, and revokes access and refresh tokens.
 *
 * Registered as the `OAuthTokenVerifierProxy` provider on module init, so
 * protected-resource modules can verify tokens through the core proxy
 * without importing this module.
 */
@Service()
export class OAuthTokenService implements OAuthTokenVerifier {
	private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 1 * Time.hours.toSeconds;
	private readonly REFRESH_TOKEN_EXPIRY_MS = 30 * Time.days.toMilliseconds;

	private readonly LAST_ACTIVE_THROTTLE_MS = 1 * Time.minutes.toMilliseconds;

	/** Per user+client timestamp of the last `lastActiveAt` write, to throttle DB updates. */
	private readonly lastActivityWrites = new Map<string, number>();

	constructor(
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly userConsentRepository: UserConsentRepository,
		private readonly resourceRegistry: ProtectedResourceRegistry,
	) {}

	getAccessTokenExpirySeconds(): number {
		return this.ACCESS_TOKEN_EXPIRY_SECONDS;
	}

	generateTokenPair(
		userId: string,
		clientId: string,
		resource: string | undefined,
		scopes: string[],
	): { accessToken: string; refreshToken: string } {
		// Pre-RFC-8707 clients omit the resource indicator; fall back to the
		// registry's default resource (the instance MCP server).
		const audience = resource ?? this.resourceRegistry.getDefaultResource()?.getResourceUrl();
		if (!audience) {
			throw new UnexpectedError(
				'Cannot mint an OAuth access token: no resource requested and no default protected resource is registered',
			);
		}

		const accessToken = this.jwtService.sign({
			sub: userId,
			aud: audience,
			client_id: clientId,
			jti: randomUUID(),
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_EXPIRY_SECONDS,
			// RFC 9068 space-delimited scope claim. Always present on new tokens
			// (empty string for scope-less grants), so an absent claim
			// unambiguously identifies a token minted before scoping shipped.
			scope: scopes.join(' '),
			meta: {
				isOAuth: true,
			},
		});

		const refreshToken = randomBytes(32).toString('hex');

		return { accessToken, refreshToken };
	}

	async saveTokenPair(
		accessToken: string,
		refreshToken: string,
		clientId: string,
		userId: string,
		scopes: string[],
	): Promise<void> {
		await this.accessTokenRepository.manager.transaction(async (transactionManager) => {
			await transactionManager.insert(this.accessTokenRepository.target, {
				token: accessToken,
				clientId,
				userId,
			});

			await transactionManager.insert(this.refreshTokenRepository.target, {
				token: refreshToken,
				clientId,
				userId,
				expiresAt: Date.now() + this.REFRESH_TOKEN_EXPIRY_MS,
				scope: scopes,
			});
		});
	}

	async validateAndRotateRefreshToken(
		refreshToken: string,
		clientId: string,
		resource?: string,
	): Promise<OAuthTokens> {
		return await withTransaction(this.refreshTokenRepository.manager, undefined, async (trx) => {
			const now = Date.now();

			const refreshTokenRecord = await trx.findOne(RefreshToken, {
				where: {
					token: refreshToken,
					clientId,
				},
			});

			// InvalidGrantError so the SDK token handler responds 400 invalid_grant (RFC 6749 §5.2)
			// instead of 500 server_error, letting clients fall back to re-authorization.
			if (!refreshTokenRecord) {
				throw new InvalidGrantError('Invalid refresh token');
			}

			const result = await trx.delete(RefreshToken, {
				token: refreshToken,
				clientId,
				expiresAt: MoreThanOrEqual(now),
			});

			const numAffected = result.affected ?? 0;
			if (numAffected < 1) {
				throw new InvalidGrantError('Invalid refresh token');
			}

			const scopes = await this.resolveGrantedScopes(refreshTokenRecord.scope, resource);

			const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
				refreshTokenRecord.userId,
				clientId,
				resource,
				scopes,
			);

			await trx.insert(AccessToken, {
				token: accessToken,
				clientId,
				userId: refreshTokenRecord.userId,
			});

			await trx.insert(RefreshToken, {
				token: newRefreshToken,
				clientId,
				userId: refreshTokenRecord.userId,
				expiresAt: now + this.REFRESH_TOKEN_EXPIRY_MS,
				scope: scopes,
			});

			this.logger.info('Refresh token rotated and new access token issued', {
				clientId,
				userId: refreshTokenRecord.userId,
			});

			return {
				access_token: accessToken,
				token_type: 'Bearer',
				expires_in: this.ACCESS_TOKEN_EXPIRY_SECONDS,
				refresh_token: newRefreshToken,
				scope: scopes.join(' '),
			};
		});
	}

	/**
	 * Effective scopes for a stored grant (auth code or refresh token). Grants
	 * made before scoping shipped carry the migration backfill sentinel — those
	 * were full user-delegations, so they keep the resource's full scope set.
	 * The data self-heals: rows written from here on store real scopes.
	 *
	 * TODO: drop the sentinel substitution once refresh tokens minted before
	 * scoping shipped (2026-07) have aged out (30-day refresh-token lifespan).
	 */
	async resolveGrantedScopes(
		storedScopes: string[],
		resource: string | undefined,
	): Promise<string[]> {
		const isPreScopingSentinel =
			storedScopes.length === PRE_SCOPING_SENTINEL.length &&
			PRE_SCOPING_SENTINEL.every((scope, i) => storedScopes[i] === scope);

		if (!isPreScopingSentinel) return storedScopes;

		return await this.getResourceScopes(resource);
	}

	/** Full scope set of the given resource, falling back to the default resource. */
	private async getResourceScopes(resource: string | undefined): Promise<string[]> {
		const target = resource
			? await this.resourceRegistry.getByResourceUrl(resource)
			: this.resourceRegistry.getDefaultResource();

		return target?.scopes ?? this.resourceRegistry.getDefaultResource()?.scopes ?? [];
	}

	async verifyAccessToken(token: string, expectedAudience?: string): Promise<AuthInfo> {
		return await this.verifyTokenWithAudiences(
			token,
			await this.getAllowedAudiences(expectedAudience),
		);
	}

	private async verifyTokenWithAudiences(
		token: string,
		allowedAudiences: string[],
	): Promise<AuthInfo> {
		let decoded: unknown;

		try {
			decoded = this.verifyJwtWithAllowedAudiences(token, allowedAudiences);
		} catch (error) {
			throw new JWTVerificationError();
		}

		const clientId = this.getStringClaim(decoded, 'client_id');
		const userId = this.getStringClaim(decoded, 'sub');
		if (!clientId || !userId) {
			throw new JWTVerificationError();
		}

		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});

		if (!accessTokenRecord) {
			throw new AccessTokenNotFoundError();
		}

		return {
			token,
			clientId,
			scopes: await this.parseScopeClaim(decoded),
			extra: {
				userId,
			},
		};
	}

	/**
	 * Scopes carried by an access token. New tokens always carry a `scope`
	 * claim (empty string for scope-less grants); an absent claim means the
	 * token was minted before scoping shipped (at most one access-token
	 * lifetime ago) and keeps its original full delegation.
	 */
	private async parseScopeClaim(decoded: unknown): Promise<string[]> {
		const scopeClaim = this.getStringClaim(decoded, 'scope');

		if (scopeClaim === null) {
			return await this.getResourceScopes(this.getStringClaim(decoded, 'aud') ?? undefined);
		}

		return scopeClaim === '' ? [] : scopeClaim.split(' ');
	}

	async verifyOAuthAccessToken(token: string, expectedAudience?: string): Promise<UserWithContext> {
		try {
			const resource = await this.getResourceByAudience(expectedAudience);

			// Fail closed: a token bearing a resource-scoped audience whose resource
			// can't be resolved (deleted, or a transient resolver failure the registry
			// swallows to `undefined`) must NOT bypass the authorize gate below.
			if (expectedAudience && !resource) {
				return { user: null, context: { reason: 'insufficient_scope', auth_type: 'oauth' } };
			}

			const authInfo = await this.verifyTokenWithAudiences(
				token,
				this.audiencesForResource(resource, expectedAudience),
			);

			const userId =
				authInfo.extra && typeof authInfo.extra === 'object'
					? this.getStringClaim(authInfo.extra, 'userId')
					: null;
			if (!userId) {
				return { user: null, context: { reason: 'user_id_not_in_auth_info', auth_type: 'oauth' } };
			}

			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});

			if (!user) {
				return { user: null, context: { reason: 'user_not_found', auth_type: 'oauth' } };
			}

			if (resource && !(await resource.authorize(user))) {
				this.logger.warn('OAuth token denied: user lacks execute access', {
					userId: user.id,
					expectedAudience,
				});
				return { user: null, context: { reason: 'insufficient_scope', auth_type: 'oauth' } };
			}

			return { user, authType: 'oauth', scopes: authInfo.scopes, clientId: authInfo.clientId };
		} catch (error) {
			const errorForSure = ensureError(error);
			const reason =
				errorForSure instanceof JWTVerificationError
					? 'invalid_token'
					: errorForSure instanceof AccessTokenNotFoundError
						? 'token_not_found_in_db'
						: 'unknown_error';
			return {
				user: null,
				context: {
					reason,
					auth_type: 'oauth',
					error_details: errorForSure.message,
				},
			};
		}
	}

	/**
	 * Records activity on the user+client grant for the connected-clients list.
	 * Called when the client actually invokes an MCP tool. Fire-and-forget and
	 * throttled so the hot request path never waits on, or hammers, the
	 * consents table.
	 */
	recordClientActivity(userId: string, clientId: string): void {
		const key = `${userId}:${clientId}`;
		const now = Date.now();
		const lastWrite = this.lastActivityWrites.get(key);
		if (lastWrite !== undefined && now - lastWrite < this.LAST_ACTIVE_THROTTLE_MS) return;
		this.lastActivityWrites.set(key, now);

		void (async () => {
			try {
				await this.userConsentRepository.update({ userId, clientId }, { lastActiveAt: now });
			} catch (error) {
				this.logger.debug('Failed to record OAuth client activity', {
					clientId,
					error: ensureError(error).message,
				});
			}
		})();
	}

	/** Deletes every access and refresh token a user holds for a client. */
	async revokeAllTokensForGrant(clientId: string, userId: string): Promise<void> {
		await this.accessTokenRepository.delete({ clientId, userId });
		await this.refreshTokenRepository.delete({ clientId, userId });
	}

	async revokeAccessToken(token: string, clientId: string): Promise<boolean> {
		const result = await this.accessTokenRepository.delete({
			token,
			clientId,
		});

		const revoked = (result.affected ?? 0) > 0;

		if (revoked) {
			this.logger.info('Access token revoked', { clientId });
		}

		return revoked;
	}

	async revokeRefreshToken(token: string, clientId: string): Promise<boolean> {
		const result = await this.refreshTokenRepository.delete({
			token,
			clientId,
		});

		const revoked = (result.affected ?? 0) > 0;

		if (revoked) {
			this.logger.info('Refresh token revoked', { clientId });
		}

		return revoked;
	}

	/**
	 * Resolve the `aud` values a token may carry for the given resource.
	 *
	 * Audiences come from the matching registered resource ONLY — never union
	 * audiences across resources, otherwise a token minted for one resource
	 * would pass another resource's gate (cross-resource token replay).
	 * Resource-specific legacy audiences (e.g. the instance MCP server's
	 * pre-RFC-8707 `mcp-server-api`) stay scoped to their own resource this way.
	 */
	private async getAllowedAudiences(expectedAudience?: string): Promise<string[]> {
		const resource = expectedAudience
			? await this.resourceRegistry.getByResourceUrl(expectedAudience)
			: undefined;
		return this.audiencesForResource(resource, expectedAudience);
	}

	/**
	 * Derive the `aud` values accepted for a (possibly pre-resolved) resource.
	 * Single source of the audience-derivation rule shared by `getAllowedAudiences`
	 * and the resolve-once path in `verifyOAuthAccessToken`.
	 */
	private audiencesForResource(
		resource: ProtectedResource | undefined,
		expectedAudience?: string,
	): string[] {
		if (expectedAudience) {
			return resource ? resource.getAudiences() : [expectedAudience];
		}

		// No expected audience: the caller cannot know which resource the token
		// targets (MCP SDK generic verification), so accept any registered
		// resource's audiences. Resource gates must pass `expectedAudience`.
		return this.resourceRegistry.getAllAudiences();
	}

	private async getResourceByAudience(
		expectedAudience?: string,
	): Promise<ProtectedResource | undefined> {
		if (!expectedAudience) {
			return this.resourceRegistry.getDefaultResource();
		}
		return await this.resourceRegistry.getByResourceUrl(expectedAudience);
	}

	// TODO: drop legacy audiences and the per-audience fallback once all legacy
	// tokens minted before n8n v2.19 have aged out (refresh-token lifespan).
	private verifyJwtWithAllowedAudiences(token: string, audiences: string[]): unknown {
		try {
			return this.jwtService.verify(token, {
				audience: audiences as [string, ...string[]],
			});
		} catch (error) {
			// Some jsonwebtoken builds reject the array form for tokens signed with a single-string aud.
			for (const audience of audiences) {
				try {
					return this.jwtService.verify(token, { audience });
				} catch {
					continue;
				}
			}

			throw error;
		}
	}

	private getStringClaim(payload: unknown, claim: string): string | null {
		if (!payload || typeof payload !== 'object') return null;
		const claimValue = (payload as Record<string, unknown>)[claim];
		return typeof claimValue === 'string' ? claimValue : null;
	}
}
