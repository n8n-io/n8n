import { EmbedLoginBodyDto, EmbedLoginQueryDto } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { Body, Get, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { EventService } from '@/events/event.service';
import { AuthlessRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import { validateRedirectUrl } from '@/utils/validate-redirect-url';

import { TokenExchangeService } from '../services/token-exchange.service';
import { TokenExchangeConfig } from '../token-exchange.config';
import { TokenExchangeAuthError, TokenExchangeRequestError } from '../token-exchange.errors';
import { TokenExchangeFailureReason } from '../token-exchange.types';
import { Container } from '@n8n/di';

const configService = Container.get(TokenExchangeConfig);

@RestController('/auth/embed')
export class EmbedAuthController {
	constructor(
		private readonly config: TokenExchangeConfig,
		private readonly tokenExchangeService: TokenExchangeService,
		private readonly authService: AuthService,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {}

	@Get('/', {
		skipAuth: true,
		ipRateLimit: {
			limit: configService.rateLimitEmbedLogin,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async getLogin(req: AuthlessRequest, res: Response, @Query query: EmbedLoginQueryDto) {
		if (!this.config.embedEnabled) {
			res.status(501).json({
				error: 'server_error',
				error_description: 'Embed login is not enabled on this instance',
			});
			return;
		}
		return await this.handleLogin(query.token, req, res, query.redirectTo);
	}

	@Post('/', {
		skipAuth: true,
		ipRateLimit: {
			limit: configService.rateLimitEmbedLogin,
			windowMs: 1 * Time.minutes.toMilliseconds,
		},
	})
	async postLogin(req: AuthlessRequest, res: Response, @Body body: EmbedLoginBodyDto) {
		if (!this.config.embedEnabled) {
			res.status(501).json({
				error: 'server_error',
				error_description: 'Embed login is not enabled on this instance',
			});
			return;
		}
		return await this.handleLogin(body.token, req, res, body.redirectTo);
	}

	private async handleLogin(
		subjectToken: string,
		req: AuthlessRequest,
		res: Response,
		redirect?: string,
	) {
		try {
			const { user, subject, issuer, kid } =
				await this.tokenExchangeService.embedLogin(subjectToken);

			this.authService.issueCookie(res, user, true, req.browserId, true, {
				sameSite: 'none',
				secure: true,
			});

			this.eventService.emit('embed-login', {
				subject,
				issuer,
				kid,
				clientIp: req.ip ?? 'unknown',
			});

			const safePath = validateRedirectUrl(redirect ?? '');
			res.redirect(this.urlService.getInstanceBaseUrl() + safePath);
		} catch (error) {
			this.eventService.emit('embed-login-failed', {
				failureReason:
					error instanceof TokenExchangeAuthError || error instanceof TokenExchangeRequestError
						? error.reason
						: TokenExchangeFailureReason.InternalError,
				clientIp: req.ip ?? 'unknown',
			});
			throw error;
		}
	}
}
