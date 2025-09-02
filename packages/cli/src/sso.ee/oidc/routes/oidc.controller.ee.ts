import { OidcConfigDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { UrlService } from '@/services/url.service';

import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '../constants';
import { OidcService } from '../oidc.service.ee';
import { AuthlessRequest } from '@/requests';
import { OIDC_STATE_COOKIE_NAME } from '@/constants';
import { Time } from '@n8n/constants';
import { GlobalConfig } from '@n8n/config';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@RestController('/sso/oidc')
export class OidcController {
	constructor(
		private readonly oidcService: OidcService,
		private readonly authService: AuthService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
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
		const authorization = await this.oidcService.generateLoginUrl();
		const { samesite, secure } = this.globalConfig.auth.cookie;

		res.cookie(OIDC_STATE_COOKIE_NAME, authorization.state, {
			maxAge: 15 * Time.minutes.toMilliseconds,
			httpOnly: true,
			sameSite: samesite,
			secure,
		});
		res.redirect(authorization.url.toString());
	}

	@Get('/callback', { skipAuth: true })
	@Licensed('feat:oidc')
	async callbackHandler(req: AuthlessRequest, res: Response) {
		const fullUrl = `${this.urlService.getInstanceBaseUrl()}${req.originalUrl}`;
		const callbackUrl = new URL(fullUrl);
		const state = req.cookies[OIDC_STATE_COOKIE_NAME];

		if (typeof state !== 'string') {
			this.logger.error('State is missing');
			throw new BadRequestError('Invalid state');
		}

		const user = await this.oidcService.loginUser(callbackUrl, state);

		res.clearCookie(OIDC_STATE_COOKIE_NAME);
		this.authService.issueCookie(res, user, true, req.browserId);

		res.redirect('/');
	}
}
