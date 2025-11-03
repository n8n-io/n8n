import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomBytes, randomUUID } from 'node:crypto';

import { JwtService } from '@/services/jwt.service';

import { AccessTokenRepository } from './oauth-access-token.repository';
import { RefreshTokenRepository } from './oauth-refresh-token.repository';

/**
 * Manages OAuth 2.1 token lifecycle for MCP server
 * Generates, validates, rotates, and revokes access and refresh tokens
 */
@Service()
export class McpOAuthTokenService {
	private readonly MCP_AUDIENCE = 'mcp-server-api';
	private readonly ACCESS_TOKEN_EXPIRY_SECONDS = 3600; // 1 hour
	private readonly REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 3600 * 1000; // 30 days

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
	): Promise<void> {
		await this.accessTokenRepository.manager.transaction(async (transactionManager) => {
			await transactionManager.save(this.accessTokenRepository.target, {
				token: accessToken,
				clientId,
				userId,
			});

			await transactionManager.save(this.refreshTokenRepository.target, {
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
	): Promise<OAuthTokens> {
		const refreshTokenRecord = await this.refreshTokenRepository.findOne({
			where: {
				token: refreshToken,
				clientId,
			},
		});

		if (!refreshTokenRecord) {
			throw new Error('Invalid refresh token');
		}

		if (refreshTokenRecord.expiresAt < Date.now()) {
			await this.refreshTokenRepository.remove(refreshTokenRecord);
			throw new Error('Refresh token expired');
		}

		const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
			refreshTokenRecord.userId,
			clientId,
		);

		await this.refreshTokenRepository.remove(refreshTokenRecord);

		await this.saveTokenPair(accessToken, newRefreshToken, clientId, refreshTokenRecord.userId);

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
	}

	async verifyAccessToken(token: string): Promise<AuthInfo> {
		let decoded;

		try {
			decoded = this.jwtService.verify(token);
		} catch (error) {
			throw new Error('Invalid access token: JWT verification failed');
		}

		if (decoded.aud !== this.MCP_AUDIENCE) {
			throw new Error(`Invalid token audience: expected ${this.MCP_AUDIENCE}`);
		}

		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});

		if (!accessTokenRecord) {
			throw new Error('Invalid access token: not found in database');
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

	async verifyOAuthToken(token: string): Promise<User | null> {
		try {
			const authInfo = await this.verifyAccessToken(token);

			const userId = authInfo.extra?.userId as string;
			if (!userId) {
				return null;
			}

			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});

			return user;
		} catch (error) {
			return null;
		}
	}

	async revokeAccessToken(token: string, clientId: string): Promise<boolean> {
		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: {
				token,
				clientId,
			},
		});

		if (!accessTokenRecord) {
			return false;
		}

		await this.accessTokenRepository.remove(accessTokenRecord);

		this.logger.info('Access token revoked', {
			clientId,
			userId: accessTokenRecord.userId,
		});

		return true;
	}

	async revokeRefreshToken(token: string, clientId: string): Promise<boolean> {
		const refreshTokenRecord = await this.refreshTokenRepository.findOne({
			where: {
				token,
				clientId,
			},
		});

		if (!refreshTokenRecord) {
			return false;
		}

		await this.refreshTokenRepository.remove(refreshTokenRecord);

		this.logger.info('Refresh token revoked', {
			clientId,
			userId: refreshTokenRecord.userId,
		});

		return true;
	}
}
