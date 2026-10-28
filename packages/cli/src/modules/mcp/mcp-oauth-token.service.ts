import { InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from 'n8n-workflow';
import { randomBytes, randomUUID } from 'node:crypto';

import { JwtService } from '@/services/jwt.service';

import type { OAuthGrantContext } from './database/oauth-grant-context';
import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from './database/repositories/oauth-refresh-token.repository';
import { AccessTokenNotFoundError, JWTVerificationError } from './mcp.errors';
import { UserWithContext } from './mcp.types';
import { OAuthGrantService } from './oauth-grant.service';

/**
 * Manages OAuth 2.1 token lifecycle for MCP server
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
		private readonly grantService: OAuthGrantService,
	) {}

	generateTokenPair(
		userId: string,
		clientId: string,
	): { accessToken: string; refreshToken: string } {
		const accessToken = this.jwtService.sign({
			sub: userId,
			aud: this.MCP_AUDIENCE,
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
		ctx?: OAuthGrantContext,
	): Promise<void> {
		await this.grantService.runForActiveUser(
			userId,
			async (ctx) => {
				await this.accessTokenRepository.insertToken(
					{
						token: accessToken,
						clientId,
						userId,
					},
					ctx,
				);

				await this.refreshTokenRepository.insertToken(
					{
						token: refreshToken,
						clientId,
						userId,
						expiresAt: Date.now() + this.REFRESH_TOKEN_EXPIRY_MS,
					},
					ctx,
				);
			},
			ctx,
		);
	}

	async validateAndRotateRefreshToken(
		refreshToken: string,
		clientId: string,
	): Promise<OAuthTokens> {
		return await this.grantService.runInTransaction(async (ctx) => {
			const refreshTokenRecord = await this.refreshTokenRepository.findByToken(
				refreshToken,
				clientId,
				ctx,
			);

			if (!refreshTokenRecord) {
				throw new InvalidGrantError('Invalid refresh token');
			}

			return await this.grantService.runForActiveUser(
				refreshTokenRecord.userId,
				async () => {
					const now = Date.now();
					if (
						!(await this.refreshTokenRepository.deleteValidByToken(
							refreshToken,
							clientId,
							now,
							ctx,
						))
					) {
						throw new InvalidGrantError('Invalid refresh token');
					}

					const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
						refreshTokenRecord.userId,
						clientId,
					);

					await this.accessTokenRepository.insertToken(
						{
							token: accessToken,
							clientId,
							userId: refreshTokenRecord.userId,
						},
						ctx,
					);

					await this.refreshTokenRepository.insertToken(
						{
							token: newRefreshToken,
							clientId,
							userId: refreshTokenRecord.userId,
							expiresAt: now + this.REFRESH_TOKEN_EXPIRY_MS,
						},
						ctx,
					);

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
				},
				ctx,
			);
		});
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		let decoded;

		try {
			decoded = this.jwtService.verify(token, { audience: this.MCP_AUDIENCE });
		} catch (error) {
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
			clientId: decoded.client_id,
			scopes: [],
			extra: {
				userId: decoded.sub,
			},
		};
	}

	async verifyOAuthAccessToken(token: string): Promise<UserWithContext> {
		try {
			const authInfo = await this.verifyAccessToken(token);

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

			if (user.disabled) {
				return { user: null, context: { reason: 'user_disabled', auth_type: 'oauth' } };
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
