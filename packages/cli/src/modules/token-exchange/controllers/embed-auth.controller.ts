import { EmbedLoginBodyDto, EmbedLoginQueryDto } from '@n8n/api-types';
import { Time } from '@n8n/constants';
import { Body, Get, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { AuthlessRequest } from '@/requests';
import { UrlService } from '@/services/url.service';

import { TokenExchangeService } from '../services/token-exchange.service';

@RestController('/auth/embed')
export class EmbedAuthController {
	constructor(
		private readonly tokenExchangeService: TokenExchangeService,
		private readonly authService: AuthService,
		private readonly urlService: UrlService,
	) {}

	@Get('/', {
		skipAuth: true,
		ipRateLimit: { limit: 20, windowMs: 1 * Time.minutes.toMilliseconds },
	})
	async getLogin(req: AuthlessRequest, res: Response, @Query query: EmbedLoginQueryDto) {
		return await this.handleLogin(query.token, req, res);
	}

	@Post('/', {
		skipAuth: true,
		ipRateLimit: { limit: 20, windowMs: 1 * Time.minutes.toMilliseconds },
	})
	async postLogin(req: AuthlessRequest, res: Response, @Body body: EmbedLoginBodyDto) {
		return await this.handleLogin(body.token, req, res);
	}

	private async handleLogin(subjectToken: string, req: AuthlessRequest, res: Response) {
		const user = await this.tokenExchangeService.embedLogin(subjectToken);

		this.authService.issueCookie(res, user, true, req.browserId);
		// TODO: Override cookie SameSite=None for embed/iframe usage.
		// The standard issueCookie uses the global config's sameSite setting.
		// For embed, SameSite=None + Secure is required. Integrate into
		// AuthService.issueCookie() options in a follow-up PR.

		res.redirect(this.urlService.getInstanceBaseUrl() + '/');
	}
}
