import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { UserRepository, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { MoreThanOrEqual } from '@n8n/typeorm';
import { ensureError } from 'n8n-workflow';
import { randomBytes, randomUUID } from 'node:crypto';

import { AccessToken } from './database/entities/oauth-access-token.entity';
import { RefreshToken } from './database/entities/oauth-refresh-token.entity';
import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from './database/repositories/oauth-refresh-token.repository';
import { AccessTokenNotFoundError, JWTVerificationError } from './mcp.errors';
import { UserWithContext } from './mcp.types';

import { JwtService } from '@/services/jwt.service';
import { UrlService } from '@/services/url.service';

/**
 * Manages OAuth 2.1 token lifecycle for MCP server
 * Generates, validates, rotates, and revokes access and refresh tokens
 */
@Service()
export class McpOAuthTokenService {
	/**
	 * Legacy fallback audience used before n8n adopted RFC 8707 resource indicators.
	 *
	 * Note: Avoid modifying this string. Active client sessions that were established
	 * before the migration rely on this exact audience value. Changing it will immediately
	 * invalidate those tokens and force users to re-authenticate.
	 */
	private readonly LEGACY_MCP_AUDIENCE = 'mcp-server-api';
	private readonly MCP_RESOURCE_PATH = '/mcp-server/http';
	private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 1 * Time.hours.toSeconds;
	private readonly REFRESH_TOKEN_EXPIRY_MS = 30 * Time.days.toMilliseconds;

	constructor(
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly urlService: UrlService,
	) {}

	private getResourceUrl(): string {
		return `${this.urlService.getInstanceBaseUrl()}${this.MCP_RESOURCE_PATH}`;
	}

	getAccessTokenExpirySeconds(): number {
		return this.ACCESS_TOKEN_EXPIRY_SECONDS;
	}

	generateTokenPair(
		userId: string,
		clientId: string,
		resource?: string,
	): { accessToken: string; refreshToken: string } {
		const audience = resource ?? this.getResourceUrl();

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

			if (!refreshTokenRecord) {
				throw new Error('Invalid refresh token');
			}

			const result = await trx.delete(RefreshToken, {
				token: refreshToken,
				clientId,
				expiresAt: MoreThanOrEqual(now),
			});

			const numAffected = result.affected ?? 0;
			if (numAffected < 1) {
				throw new Error('Invalid refresh token');
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
		let decoded: unknown;

		try {
			const allowedAudiences = this.getAllowedAudiences(expectedAudience);
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
			scopes: [],
			extra: {
				userId,
			},
		};
	}

	async verifyOAuthAccessToken(token: string, expectedAudience?: string): Promise<UserWithContext> {
		try {
			const authInfo = await this.verifyAccessToken(token, expectedAudience);

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

	private getAllowedAudiences(expectedAudience?: string): string[] {
		if (expectedAudience && expectedAudience !== this.LEGACY_MCP_AUDIENCE) {
			return [expectedAudience, this.LEGACY_MCP_AUDIENCE];
		}

		return [this.LEGACY_MCP_AUDIENCE];
	}

	/**
	 * Verifies the JWT token against the list of allowed audiences.
	 *
	 * BACKWARD COMPATIBILITY: We accept both the canonical resource URL and the legacy
	 * 'mcp-server-api' audience during this transition period.
	 *
	 * TODO: Remove the fallback loop once all legacy tokens in the wild expire
	 * (based on refresh token lifespan). Legacy tokens minted prior to n8n v2.19
	 * had a hardcoded 'mcp-server-api' audience.
	 */
	private verifyJwtWithAllowedAudiences(token: string, audiences: string[]): unknown {
		if (audiences.length === 0) {
			throw new Error('At least one audience is required');
		}

		try {
			return this.jwtService.verify(token, {
				audience: audiences as [string, ...string[]],
			});
		} catch (error) {
			// Fallback: try each audience individually.
			// This handles legacy tokens signed with a single-string audience
			// (e.g. 'mcp-server-api') that were issued before resource indicators
			// were introduced, where the array check above may reject them on some
			// jsonwebtoken builds.
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
		if (!payload || typeof payload !== 'object') {
			return null;
		}

		const claimValue = Reflect.get(payload, claim);
		return typeof claimValue === 'string' ? claimValue : null;
	}
}
