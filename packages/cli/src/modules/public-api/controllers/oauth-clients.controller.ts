import {
	DeleteCliSessionResponseDto,
	ListCliSessionsResponseDto,
	CliSessionResponseDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Param, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { Time } from '@n8n/constants';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { PublicApiKeyService } from '@/services/public-api-key.service';
import { RefreshTokenRepository } from '@/modules/oauth/database/repositories/oauth-refresh-token.repository';
import { AccessTokenRepository } from '@/modules/oauth/database/repositories/oauth-access-token.repository';

const CLI_CLIENT_ID = 'n8n-cli';
const ACCESS_TOKEN_EXPIRY_SECONDS = 1 * Time.hours.toSeconds;

/**
 * Manages CLI OAuth sessions for the current user.
 * Shows active refresh token grants (with scopes) and allows revocation.
 */
@RestController('/oauth/sessions')
export class OAuthClientsController {
	constructor(
		private readonly logger: Logger,
		private readonly publicApiKeyService: PublicApiKeyService,
		private readonly refreshTokenRepository: RefreshTokenRepository,
		private readonly accessTokenRepository: AccessTokenRepository,
	) {}

	/**
	 * List active CLI sessions (refresh tokens) for current user
	 */
	@GlobalScope('apiKey:manage')
	@Get('/')
	async listSessions(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<ListCliSessionsResponseDto> {
		const refreshTokens = await this.refreshTokenRepository.find({
			where: {
				userId: req.user.id,
				clientId: CLI_CLIENT_ID,
			},
			order: { createdAt: 'DESC' },
		});

		const now = Date.now();
		const sessions: CliSessionResponseDto[] = refreshTokens
			.filter((rt) => rt.expiresAt > now)
			.map((rt) => {
				const createdAtMs = rt.createdAt.getTime();
				const metadata = rt.metadata ? (JSON.parse(rt.metadata) as Record<string, string>) : {};
				return {
					id: this.publicApiKeyService.redactApiKey(rt.token),
					scopes: rt.scopes ? (JSON.parse(rt.scopes) as string[]) : [],
					createdAt: rt.createdAt.toISOString(),
					accessTokenExpiresAt: new Date(
						createdAtMs + ACCESS_TOKEN_EXPIRY_SECONDS * 1000,
					).toISOString(),
					refreshTokenExpiresAt: new Date(rt.expiresAt).toISOString(),
					deviceName: metadata.deviceName ?? null,
					os: metadata.os ?? null,
					ip: metadata.ip ?? null,
				};
			});

		return {
			data: sessions,
			count: sessions.length,
		};
	}

	/**
	 * Revoke a CLI session by token fingerprint.
	 * Deletes the refresh token and its associated access tokens.
	 */
	@GlobalScope('apiKey:manage')
	@Delete('/:sessionId')
	async revokeSession(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sessionId') sessionId: string,
	): Promise<DeleteCliSessionResponseDto> {
		const userId = req.user.id;

		this.logger.info('Revoking CLI session', { sessionId, userId });

		const refreshTokens = await this.refreshTokenRepository.find({
			where: {
				userId,
				clientId: CLI_CLIENT_ID,
			},
		});

		const target = refreshTokens.find(
			(rt) => this.publicApiKeyService.redactApiKey(rt.token) === sessionId,
		);

		if (!target) {
			throw new NotFoundError(`CLI session not found`);
		}

		// Delete the refresh token
		await this.refreshTokenRepository.delete({ token: target.token });
		// Delete associated access tokens for this user+client
		await this.accessTokenRepository.delete({ userId, clientId: CLI_CLIENT_ID });

		this.logger.info('CLI session revoked', { sessionId, userId });

		return {
			success: true,
			message: 'CLI session has been revoked successfully',
		};
	}
}
