import { OidcConfigDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { AuthIdentityRepository, UserRepository } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { randomString } from 'n8n-workflow';
import { Issuer } from 'openid-client';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { AuthenticatedRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UrlService } from '@/services/url.service';

import { OIDC_CLIENT_SECRET_REACTED_VALUE } from '../constants';
import { OidcService } from '../oidc.service.ee';

@RestController('/sso/oidc')
export class OidcController {
	constructor(
		private oidcService: OidcService,
		private urlService: UrlService,
		private globalConfig: GlobalConfig,
		private authIdentityRepository: AuthIdentityRepository,
		private authService: AuthService,
		private userRepository: UserRepository,
		private passwordUtility: PasswordUtility,
	) {}

	@Get('/config')
	@Licensed('feat:oidc')
	@GlobalScope('oidc:manage')
	async retrieveConfiguration(_req: AuthenticatedRequest) {
		const config = await this.oidcService.loadConfig();
		if (config.clientSecret) {
			config.clientSecret = OIDC_CLIENT_SECRET_REACTED_VALUE;
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
		const config = await this.oidcService.loadConfig();
		config.clientSecret = OIDC_CLIENT_SECRET_REACTED_VALUE;
		return config;
	}

	@Get('/login', { skipAuth: true })
	async redirectToAuthProvider(_req: Request, res: Response) {
		const config = await this.oidcService.loadConfig();

		const issuer = await Issuer.discover(config.discoveryEndpoint);

		const client = new issuer.Client({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uris: [this.getCallbackUrl()],
			response_types: ['code'],
		});

		const authorizationURL = client.authorizationUrl({
			scope: 'openid email profile',
			prompt: 'select_account',
		});

		res.redirect(authorizationURL);
	}

	@Get('/callback', { skipAuth: true })
	async callbackHandler(req: Request, res: Response) {
		const config = await this.oidcService.loadConfig(true);

		const issuer = await Issuer.discover(config.discoveryEndpoint);

		const client = new issuer.Client({
			client_id: config.clientId,
			client_secret: config.clientSecret,
		});

		const params = client.callbackParams(req.originalUrl);

		const token = await client.callback(this.getCallbackUrl(), params);

		const claims = token.claims();

		if (!claims.email_verified) {
			throw new BadRequestError('Email needs to be verified');
		}

		if (!claims.email) {
			throw new BadRequestError('An email is required');
		}

		const openidUser = await this.authIdentityRepository.findOne({
			where: { providerId: claims.sub },
			relations: ['user'],
		});

		if (openidUser) {
			this.authService.issueCookie(res, openidUser.user);
			res.redirect('/workflows');
			return;
		}

		const foundUser = await this.userRepository.findOneBy({ email: claims.email });

		if (foundUser) {
			throw new BadRequestError('User already exist with that email.');
		}

		const oidcIdentity = this.authIdentityRepository.create({
			providerId: claims.sub,
			providerType: 'oidc',
		});

		const { user } = await this.userRepository.createUserWithProject({
			firstName: claims.given_name || '',
			lastName: claims.family_name || '',
			email: claims.email,
			authIdentities: [oidcIdentity],
			role: 'global:member',
			password: await this.passwordUtility.hash(randomString(8)),
		});

		const authIdentity = this.authIdentityRepository.create({
			user,
			userId: user.id,
			providerId: claims.sub,
			providerType: 'oidc',
		});

		await this.authIdentityRepository.save(authIdentity);

		this.authService.issueCookie(res, user);

		res.redirect('/workflows');
	}

	private getCallbackUrl(): string {
		return `${this.urlService.getInstanceBaseUrl()}/${this.globalConfig.endpoints.rest}/sso/oidc/callback`;
	}
}
