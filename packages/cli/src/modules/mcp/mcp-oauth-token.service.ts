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

/**
 * Manages OAuth 2.1 token lifecycle for MCP server and CLI OAuth
 * Generates, validates, rotates, and revokes access and refresh tokens
 */
@Service()
export class McpOAuthTokenService {
	private readonly MCP_AUDIENCE = 'mcp-server-api';
	private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 1 * Time.hours.toSeconds;
	private readonly REFRESH_TOKEN_EXPIRY_MS = 30 * Time.days.toMilliseconds;

	constructor(
		private readonly logger: Logger,
		private readonly jwtService: JwtService,
		private readonly userRepository: UserRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
		private readonly refreshTokenRepository: RefreshTokenRepository,
	) {}

	generateTokenPair(
		userId: string,
		clientId: string,
		audience: string = this.MCP_AUDIENCE,
		scopes?: string[],
	): { accessToken: string; refreshToken: string } {
		const payload: Record<string, unknown> = {
			sub: userId,
			aud: audience,
			client_id: clientId,
			jti: randomUUID(),
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_EXPIRY_SECONDS,
			meta: {
				isOAuth: true,
			},
		};

		if (scopes && scopes.length > 0) {
			payload.scope = scopes.join(' ');
		}

		const accessToken = this.jwtService.sign(payload);

		const refreshToken = randomBytes(32).toString('hex');

		return { accessToken, refreshToken };
	}

	async saveTokenPair(
		accessToken: string,
		refreshToken: string,
		clientId: string,
		userId: string,
		scopes?: string[],
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
				scopes: scopes ? JSON.stringify(scopes) : null,
			});
		});
	}

	async validateAndRotateRefreshToken(
		refreshToken: string,
		clientId: string,
		audience: string = this.MCP_AUDIENCE,
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

			// Preserve scopes from the old refresh token
			const scopes = refreshTokenRecord.scopes
				? (JSON.parse(refreshTokenRecord.scopes) as string[])
				: undefined;

			const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
				refreshTokenRecord.userId,
				clientId,
				audience,
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
				scopes: refreshTokenRecord.scopes,
			});

			this.logger.info('Refresh token rotated and new access token issued', {
				clientId,
				userId: refreshTokenRecord.userId,
			});

			const tokenResponse: OAuthTokens = {
				access_token: accessToken,
				token_type: 'Bearer',
				expires_in: this.ACCESS_TOKEN_EXPIRY_SECONDS,
				refresh_token: newRefreshToken,
			};

			if (scopes && scopes.length > 0) {
				(tokenResponse as OAuthTokens & { scope: string }).scope = scopes.join(' ');
			}

			return tokenResponse;
		});
	}

	async verifyAccessToken(token: string, audience: string = this.MCP_AUDIENCE): Promise<AuthInfo> {
		let decoded;

		try {
			decoded = this.jwtService.verify(token, { audience });
		} catch (error) {
			throw new JWTVerificationError();
		}

		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});

		if (!accessTokenRecord) {
			throw new AccessTokenNotFoundError();
		}

		const scopes: string[] = decoded.scope ? (decoded.scope as string).split(' ') : [];

		return {
			token,
			clientId: decoded.client_id,
			scopes,
			extra: {
				userId: decoded.sub,
			},
		};
	}

	async verifyOAuthAccessToken(
		token: string,
		audience: string = this.MCP_AUDIENCE,
	): Promise<UserWithContext> {
		try {
			const authInfo = await this.verifyAccessToken(token, audience);

			const userId = authInfo.extra?.userId as string;
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

			return { user };
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
}
