import { OidcConfigDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, InstanceSettingsLoaderConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { OIDC_NONCE_COOKIE_NAME, OIDC_STATE_COOKIE_NAME } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { AuthlessRequest } from '@/requests';
import { UrlService } from '@/services/url.service';
import { isOidcCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';

import {
	OIDC_CLIENT_SECRET_REDACTED_VALUE,
	OIDC_ID_TOKEN_COOKIE_MAX_BYTES,
	OIDC_ID_TOKEN_COOKIE_NAME,
} from './constants';
import { OidcService } from './oidc.service.ee';
import { renderOidcTestFailure, renderOidcTestSuccess } from './views/oidc-test-result';

@RestController('/sso/oidc')
export class OidcController {
	constructor(
		private readonly oidcService: OidcService,
		private readonly authService: AuthService,
		private readonly eventService: EventService,
		private readonly urlService: UrlService,
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
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
		if (this.instanceSettingsLoaderConfig.ssoManagedByEnv) {
			throw new ForbiddenError(
				'OIDC configuration is managed via environment variables and cannot be modified through the API',
			);
		}
		await this.oidcService.updateConfig(payload);
		const config = this.oidcService.getRedactedConfig();
		return config;
	}

	@Post('/config/test')
	@Licensed('feat:oidc')
	@GlobalScope('oidc:manage')
	async testConnection(_req: AuthenticatedRequest, res: Response) {
		const authorization = await this.oidcService.generateTestLoginUrl();
		const { samesite, secure } = this.globalConfig.auth.cookie;

		res.cookie(OIDC_STATE_COOKIE_NAME, authorization.state, {
			maxAge: 15 * Time.minutes.toMilliseconds,
			httpOnly: true,
			sameSite: samesite,
			secure,
		});
		res.cookie(OIDC_NONCE_COOKIE_NAME, authorization.nonce, {
			maxAge: 15 * Time.minutes.toMilliseconds,
			httpOnly: true,
			sameSite: samesite,
			secure,
		});

		return { url: authorization.url.toString() };
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
		res.cookie(OIDC_NONCE_COOKIE_NAME, authorization.nonce, {
			maxAge: 15 * Time.minutes.toMilliseconds,
			httpOnly: true,
			sameSite: samesite,
			secure,
		});
		res.redirect(authorization.url.toString());
	}

	@Get('/callback', { skipAuth: true, usesTemplates: true })
	@Licensed('feat:oidc')
	async callbackHandler(req: AuthlessRequest, res: Response) {
		const fullUrl = `${this.urlService.getInstanceBaseUrl()}${req.originalUrl}`;
		const callbackUrl = new URL(fullUrl);
		const state = req.cookies[OIDC_STATE_COOKIE_NAME];

		if (typeof state !== 'string') {
			this.logger.error('State is missing');
			throw new BadRequestError('Invalid state');
		}

		const nonce = req.cookies[OIDC_NONCE_COOKIE_NAME];

		if (typeof nonce !== 'string') {
			this.logger.error('Nonce is missing');
			throw new BadRequestError('Invalid nonce');
		}

		const stateInfo = this.oidcService.verifyState(state);

		res.clearCookie(OIDC_STATE_COOKIE_NAME);
		res.clearCookie(OIDC_NONCE_COOKIE_NAME);

		if (stateInfo.testMode) {
			try {
				const result = await this.oidcService.processTestCallback(callbackUrl, state, nonce);
				return res.send(renderOidcTestSuccess(result));
			} catch (error) {
				return res.send(renderOidcTestFailure(error));
			}
		}

		const { user, idToken } = await this.oidcService.loginUser(callbackUrl, state, nonce);

		this.authService.issueCookie(res, user, true, req.browserId);

		// Persist the encrypted ID token so a later sign-out can perform OIDC
		// RP-Initiated Logout with the required `id_token_hint`. The cookie's
		// presence also marks this session as OIDC-established, as opposed to
		// e.g. an email session of the instance owner.
		if (idToken) {
			const encryptedIdToken = this.oidcService.encryptIdToken(idToken);
			if (Buffer.byteLength(encryptedIdToken, 'utf8') <= OIDC_ID_TOKEN_COOKIE_MAX_BYTES) {
				const { samesite, secure } = this.globalConfig.auth.cookie;
				res.cookie(OIDC_ID_TOKEN_COOKIE_NAME, encryptedIdToken, {
					maxAge: this.authService.jwtExpiration * Time.seconds.toMilliseconds,
					httpOnly: true,
					sameSite: samesite,
					secure,
				});
			} else {
				this.logger.warn(
					'The OIDC ID token is too large to be stored in a cookie. Signing out will terminate the n8n session but not the OIDC provider session. Consider reducing the claims included in the ID token.',
				);
			}
		}
		this.eventService.emit('user-logged-in', {
			user,
			authenticationMethod: 'oidc',
		});

		return res.redirect('/');
	}

	/**
	 * Signs the user out of n8n and, when the session was established through
	 * OIDC, returns the provider's RP-Initiated Logout URL (built from the
	 * discovered `end_session_endpoint`, including the `id_token_hint`) for
	 * the client to redirect to. The n8n session is always invalidated first,
	 * so whatever happens at the provider afterwards cannot leave a valid n8n
	 * session behind.
	 */
	@Post('/logout')
	@Licensed('feat:oidc')
	async logout(req: AuthenticatedRequest, res: Response) {
		await this.authService.invalidateToken(req);
		this.authService.clearCookie(res);

		const encryptedIdToken: unknown = req.cookies[OIDC_ID_TOKEN_COOKIE_NAME];
		res.clearCookie(OIDC_ID_TOKEN_COOKIE_NAME);

		// Only sessions established through OIDC carry the ID token cookie:
		// email or LDAP sessions must never trigger a logout at the provider.
		if (
			typeof encryptedIdToken !== 'string' ||
			encryptedIdToken === '' ||
			!isOidcCurrentAuthenticationMethod()
		) {
			return { redirectUrl: null };
		}

		const idToken = this.oidcService.decryptIdToken(encryptedIdToken);
		if (!idToken) {
			return { redirectUrl: null };
		}

		try {
			const endSessionUrl = await this.oidcService.generateEndSessionUrl(idToken);
			return { redirectUrl: endSessionUrl?.toString() ?? null };
		} catch (error) {
			// The n8n session is already terminated at this point; a failure to
			// reach the provider (e.g. discovery endpoint unavailable) must not
			// fail the sign-out itself.
			this.logger.warn('Failed to build the OIDC RP-initiated logout URL', { error });
			return { redirectUrl: null };
		}
	}
}
