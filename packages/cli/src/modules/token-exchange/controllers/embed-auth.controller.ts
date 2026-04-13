import { EmbedLoginBodyDto, EmbedLoginQueryDto } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { Body, Get, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { EventService } from '@/events/event.service';
import { AuthlessRequest } from '@/requests';
import { UrlService } from '@/services/url.service';

import { TokenExchangeService } from '../services/token-exchange.service';
import { TokenExchangeConfig } from '../token-exchange.config';

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
		ipRateLimit: { limit: 20, windowMs: 1 * Time.minutes.toMilliseconds },
	})
	async getLogin(req: AuthlessRequest, res: Response, @Query query: EmbedLoginQueryDto) {
		if (!this.config.embedEnabled) {
			res.status(501).json({
				error: 'server_error',
				error_description: 'Embed login is not enabled on this instance',
			});
			return;
		}
		return await this.handleLogin(query.token, req, res);
	}

	@Post('/', {
		skipAuth: true,
		ipRateLimit: { limit: 20, windowMs: 1 * Time.minutes.toMilliseconds },
	})
	async postLogin(req: AuthlessRequest, res: Response, @Body body: EmbedLoginBodyDto) {
		if (!this.config.embedEnabled) {
			res.status(501).json({
				error: 'server_error',
				error_description: 'Embed login is not enabled on this instance',
			});
			return;
		}
		return await this.handleLogin(body.token, req, res);
	}

	private async handleLogin(subjectToken: string, req: AuthlessRequest, res: Response) {
		const { user, subject, issuer, kid } = await this.tokenExchangeService.embedLogin(subjectToken);

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

		res.redirect(this.urlService.getInstanceBaseUrl() + '/');
	}
}
