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
import type { ProtectedResource } from '@/services/protected-resource.registry';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import { AccessTokenNotFoundError, JWTVerificationError } from './oauth.errors';

import { JwtService } from '@/services/jwt.service';
import type {
	OAuthTokenVerifier,
	UserWithContext,
} from '@/services/oauth-token-verifier-proxy.service';

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

	constructor(
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly resourceRegistry: ProtectedResourceRegistry,
	) {}

	getAccessTokenExpirySeconds(): number {
		return this.ACCESS_TOKEN_EXPIRY_SECONDS;
	}

	generateTokenPair(
		userId: string,
		clientId: string,
		resource?: string,
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

			const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
				refreshTokenRecord.userId,
				clientId,
				resource,
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
			};
		});
	}

	async verifyAccessToken(token: string, expectedAudience?: string): Promise<AuthInfo> {
		const resource = expectedAudience
			? await this.resourceRegistry.getByResourceUrl(expectedAudience)
			: undefined;
		return await this.verifyTokenForResource(token, resource, expectedAudience);
	}

	private async verifyTokenForResource(
		token: string,
		resource: ProtectedResource | undefined,
		expectedAudience?: string,
	): Promise<AuthInfo> {
		let decoded: unknown;

		try {
			// Audience is validated separately: alias audiences resolve through the
			// resource registry, which `jsonwebtoken`'s string-equality check can't do.
			decoded = this.jwtService.verify(token);
		} catch (error) {
			throw new JWTVerificationError();
		}

		const audiences = this.getAudienceClaim(decoded);
		if (
			audiences.length === 0 ||
			!(await this.isAudienceAllowed(audiences, resource, expectedAudience))
		) {
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
			scopes: [],
			extra: {
				userId,
			},
		};
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

			const authInfo = await this.verifyTokenForResource(token, resource, expectedAudience);

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

			return { user, authType: 'oauth' };
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
	 * Whether a token's `aud` values may be accepted at the given resource's gate.
	 *
	 * Audiences come from the matching registered resource ONLY — never union
	 * audiences across resources, otherwise a token minted for one resource
	 * would pass another resource's gate (cross-resource token replay).
	 * Resource-specific legacy audiences (e.g. the instance MCP server's
	 * pre-RFC-8707 `mcp-server-api`) stay scoped to their own resource this way.
	 *
	 * Beyond the resource's declared audiences, an `aud` that resolves through
	 * the registry to the same resource is also accepted — for alias-accepting
	 * resources this includes any hostname with the resource's URL path: on
	 * split-hostname deployments clients request tokens with the hostname they
	 * connect through, so the minted `aud` may carry an alias of the resource
	 * rather than its canonical URL.
	 *
	 * Because that alias host is client-supplied, the `aud` host is not a
	 * trustworthy provenance signal — never treat it as one in logs/audit. Token
	 * trust rests on the instance signing key and the server-side token record,
	 * not on `aud`.
	 */
	// TODO: drop legacy audiences once all legacy tokens minted before n8n v2.19
	// have aged out (refresh-token lifespan).
	private async isAudienceAllowed(
		audiences: string[],
		resource: ProtectedResource | undefined,
		expectedAudience?: string,
	): Promise<boolean> {
		if (expectedAudience) {
			if (!resource) {
				return audiences.includes(expectedAudience);
			}

			const allowed = resource.getAudiences();
			for (const audience of audiences) {
				if (allowed.includes(audience)) return true;
				const audienceResource = await this.resourceRegistry.getByResourceUrl(audience);
				if (audienceResource?.id === resource.id) return true;
			}
			return false;
		}

		// No expected audience: the caller cannot know which resource the token
		// targets (MCP SDK generic verification), so accept any registered
		// resource's audiences. Resource gates must pass `expectedAudience`.
		const allAudiences = this.resourceRegistry.getAllAudiences();
		for (const audience of audiences) {
			if (allAudiences.includes(audience)) return true;
			if (await this.resourceRegistry.getByResourceUrl(audience)) return true;
		}
		return false;
	}

	private async getResourceByAudience(
		expectedAudience?: string,
	): Promise<ProtectedResource | undefined> {
		if (!expectedAudience) {
			return this.resourceRegistry.getDefaultResource();
		}
		return await this.resourceRegistry.getByResourceUrl(expectedAudience);
	}

	/** JWT `aud` may be a single string or an array of strings (RFC 7519 §4.1.3). */
	private getAudienceClaim(payload: unknown): string[] {
		if (!payload || typeof payload !== 'object') return [];
		const audience = (payload as Record<string, unknown>).aud;
		if (typeof audience === 'string') return [audience];
		if (Array.isArray(audience)) {
			return audience.filter((value): value is string => typeof value === 'string');
		}
		return [];
	}

	private getStringClaim(payload: unknown, claim: string): string | null {
		if (!payload || typeof payload !== 'object') return null;
		const claimValue = (payload as Record<string, unknown>)[claim];
		return typeof claimValue === 'string' ? claimValue : null;
	}
}
