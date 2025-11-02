import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { User, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { randomBytes, randomUUID } from 'node:crypto';

import { JwtService } from '@/services/jwt.service';

import { AccessTokenRepository } from './oauth-access-token.repository';
import { RefreshTokenRepository } from './oauth-refresh-token.repository';

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

	/**
	 * Generate token pair (access + refresh)
	 * Access token: JWT with MCP audience claim (RFC 8707)
	 * Refresh token: Cryptographically secure opaque token
	 */
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

	/**
	 * Save token pair to database with transaction
	 * Ensures atomicity - both tokens saved or neither
	 */
	async saveTokenPair(
		accessToken: string,
		refreshToken: string,
		clientId: string,
		userId: string,
	): Promise<void> {
		// Wrap in transaction for atomicity
		// Note: Access tokens are JWTs with embedded exp claim, validated by jwtService.verify()
		// We store the JWT in DB only for immediate revocation capability
		await this.accessTokenRepository.manager.transaction(async (transactionManager) => {
			await transactionManager.save(this.accessTokenRepository.target, {
				token: accessToken,
				clientId,
				userId,
				revoked: false,
			});

			await transactionManager.save(this.refreshTokenRepository.target, {
				token: refreshToken,
				clientId,
				userId,
				expiresAt: Date.now() + this.REFRESH_TOKEN_EXPIRY_MS,
			});
		});
	}

	/**
	 * Validate refresh token and rotate (OAuth 2.1 security best practice)
	 * Returns new token pair, invalidates old refresh token
	 */
	async validateAndRotateRefreshToken(
		refreshToken: string,
		clientId: string,
	): Promise<OAuthTokens> {
		// Validate refresh token
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

		// Generate new token pair (refresh token rotation for OAuth 2.1 security)
		const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(
			refreshTokenRecord.userId,
			clientId,
		);

		// Invalidate old refresh token (prevents reuse)
		await this.refreshTokenRepository.remove(refreshTokenRecord);

		// Save new token pair to database
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

	/**
	 * Verify JWT access token
	 * 3-step validation: JWT signature → MCP audience → revocation check
	 */
	async verifyAccessToken(token: string): Promise<AuthInfo> {
		// Step 1: Verify JWT signature and decode claims
		let decoded: {
			sub: string;
			aud: string;
			client_id: string;
			jti: string;
			iat: number;
			exp: number;
		};

		try {
			decoded = this.jwtService.verify(token);
		} catch (error) {
			throw new Error('Invalid access token: JWT verification failed');
		}

		// Step 2: Validate audience (MCP spec requirement - RFC 8707)
		if (decoded.aud !== this.MCP_AUDIENCE) {
			throw new Error(`Invalid token audience: expected ${this.MCP_AUDIENCE}, got ${decoded.aud}`);
		}

		// Step 3: Check database for revocation (immediate revocation on user action)
		const accessTokenRecord = await this.accessTokenRepository.findOne({
			where: { token },
		});

		if (!accessTokenRecord) {
			throw new Error('Invalid access token: not found in database');
		}

		if (accessTokenRecord.revoked) {
			throw new Error('Access token has been revoked');
		}

		// JWT expiry is validated by jwtService.verify(), no need to check expiresAt again

		// Return auth info from JWT claims
		return {
			token,
			clientId: decoded.client_id,
			scopes: [], // Scopes support deferred - MCP SDK supports it but n8n doesn't implement granular permissions yet
			extra: {
				userId: decoded.sub,
			},
		};
	}

	/**
	 * Verify OAuth access token and return user
	 * Validates JWT signature, audience, revocation, and fetches user from database
	 * Used by middleware for authentication
	 */
	async verifyOAuthToken(token: string): Promise<User | null> {
		try {
			// Verify token (JWT signature + audience + revocation check)
			const authInfo = await this.verifyAccessToken(token);

			// Extract userId from token claims
			const userId = authInfo.extra?.userId as string;
			if (!userId) {
				return null;
			}

			// Fetch user from database
			const user = await this.userRepository.findOne({
				where: { id: userId },
				relations: ['role'],
			});

			return user;
		} catch (error) {
			// Token validation failed
			return null;
		}
	}

	/**
	 * Revoke access token (mark as revoked for immediate invalidation)
	 */
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

		accessTokenRecord.revoked = true;
		await this.accessTokenRepository.save(accessTokenRecord);

		this.logger.info('Access token revoked', {
			clientId,
			userId: accessTokenRecord.userId,
		});

		return true;
	}

	/**
	 * Revoke refresh token (delete from database)
	 */
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
