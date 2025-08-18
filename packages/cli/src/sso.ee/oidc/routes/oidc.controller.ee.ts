import { OidcConfigDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { UrlService } from '@/services/url.service';

import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '../constants';
import { OidcService } from '../oidc.service.ee';

@RestController('/sso/oidc')
export class OidcController {
	constructor(
		private readonly oidcService: OidcService,
		private readonly authService: AuthService,
		private readonly urlService: UrlService,
	) {}

	@Get('/config')
	@Licensed('feat:oidc')
	@GlobalScope('oidc:manage')
	async retrieveConfiguration(_req: AuthenticatedRequest) {
		const config = await this.oidcService.loadConfig();
		if (config.clientSecret) {
			config.clientSecret = OIDC_CLIENT_SECRET_REDACTED_VALUE;
		}
		return config;
	}

	@Post('/config')
	@Licensed('feat:oidc')
	@GlobalScope('oidc:manage')
	async saveConfiguration(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: OidcConfigDto,
	) {
		await this.oidcService.updateConfig(payload);
		const config = this.oidcService.getRedactedConfig();
		return config;
	}

	@Get('/login', { skipAuth: true })
	@Licensed('feat:oidc')
	async redirectToAuthProvider(_req: Request, res: Response) {
		const authorizationURL = await this.oidcService.generateLoginUrl();

		res.redirect(authorizationURL.toString());
	}

	@Get('/callback', { skipAuth: true })
	@Licensed('feat:oidc')
	async callbackHandler(req: Request, res: Response) {
		const fullUrl = `${this.urlService.getInstanceBaseUrl()}${req.originalUrl}`;
		const callbackUrl = new URL(fullUrl);

		const user = await this.oidcService.loginUser(callbackUrl);

		this.authService.issueCookie(res, user, true);

		res.redirect('/');
	}
}
