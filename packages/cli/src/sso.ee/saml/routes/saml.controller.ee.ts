import { SamlAcsDto, SamlPreferences, SamlToggleDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController, GlobalScope, Body } from '@n8n/decorators';
import { Response } from 'express';
import querystring from 'querystring';
import type { PostBindingContext } from 'samlify/types/src/entity';
import url from 'url';

import { AuthService } from '@/auth/auth.service';
import { AuthError } from '@/errors/response-errors/auth.error';
import { EventService } from '@/events/event.service';
import { AuthlessRequest } from '@/requests';
import { sendErrorResponse } from '@/response-helper';
import { UrlService } from '@/services/url.service';

import {
	samlLicensedAndEnabledMiddleware,
	samlLicensedMiddleware,
} from '../middleware/saml-enabled-middleware';
import { isConnectionTestRequest, isSamlLicensedAndEnabled } from '../saml-helpers';
import { SamlService } from '../saml.service.ee';
import {
	getServiceProviderConfigTestReturnUrl,
	getServiceProviderEntityId,
	getServiceProviderReturnUrl,
} from '../service-provider.ee';
import type { SamlLoginBinding } from '../types';
import { getInitSSOFormView } from '../views/init-sso-post';

@RestController('/sso/saml')
export class SamlController {
	constructor(
		private readonly authService: AuthService,
		private readonly samlService: SamlService,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {}

	@Get('/metadata', { skipAuth: true })
	async getServiceProviderMetadata(_: AuthlessRequest, res: Response) {
		return res
			.header('Content-Type', 'text/xml')
			.send(this.samlService.getServiceProviderInstance().getMetadata());
	}

	/**
	 * Return SAML config
	 */
	@Get('/config', { middlewares: [samlLicensedMiddleware] })
	async configGet() {
		const prefs = this.samlService.samlPreferences;
		return {
			...prefs,
			entityID: getServiceProviderEntityId(),
			returnUrl: getServiceProviderReturnUrl(),
		};
	}

	/**
	 * Set SAML config
	 */
	@Post('/config', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async configPost(_req: AuthenticatedRequest, _res: Response, @Body payload: SamlPreferences) {
		return await this.samlService.setSamlPreferences(payload);
	}

	/**
	 * Toggle SAML status
	 */
	@Post('/config/toggle', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async toggleEnabledPost(
		_req: AuthenticatedRequest,
		res: Response,
		@Body { loginEnabled }: SamlToggleDto,
	) {
		await this.samlService.setSamlPreferences({ loginEnabled });
		return res.sendStatus(200);
	}

	/**
	 * Assertion Consumer Service endpoint
	 */
	@Get('/acs', { middlewares: [samlLicensedMiddleware], skipAuth: true, usesTemplates: true })
	async acsGet(req: AuthlessRequest, res: Response) {
		return await this.acsHandler(req, res, 'redirect');
	}

	/**
	 * Assertion Consumer Service endpoint
	 */
	@Post('/acs', { middlewares: [samlLicensedMiddleware], skipAuth: true, usesTemplates: true })
	async acsPost(req: AuthlessRequest, res: Response, @Body payload: SamlAcsDto) {
		return await this.acsHandler(req, res, 'post', payload);
	}

	/**
	 * Handles the ACS endpoint for both GET and POST requests
	 * Available if SAML is licensed, even if not enabled to run connection tests
	 * For test connections, returns status 202 if SAML is not enabled
	 */
	private async acsHandler(
		req: AuthlessRequest,
		res: Response,
		binding: SamlLoginBinding,
		payload: SamlAcsDto = {},
	) {
		try {
			const loginResult = await this.samlService.handleSamlLogin(req, binding);
			// if RelayState is set to the test connection Url, this is a test connection
			if (isConnectionTestRequest(payload)) {
				if (loginResult.authenticatedUser) {
					return res.render('saml-connection-test-success', loginResult.attributes);
				} else {
					return res.render('saml-connection-test-failed', {
						message: '',
						attributes: loginResult.attributes,
					});
				}
			}
			if (loginResult.authenticatedUser) {
				this.eventService.emit('user-logged-in', {
					user: loginResult.authenticatedUser,
					authenticationMethod: 'saml',
				});

				// Only sign in user if SAML is enabled, otherwise treat as test connection
				if (isSamlLicensedAndEnabled()) {
					this.authService.issueCookie(res, loginResult.authenticatedUser, false, req.browserId);
					if (loginResult.onboardingRequired) {
						return res.redirect(this.urlService.getInstanceBaseUrl() + '/saml/onboarding');
					} else {
						const redirectUrl = payload.RelayState ?? '/';
						return res.redirect(this.urlService.getInstanceBaseUrl() + redirectUrl);
					}
				} else {
					return res.status(202).send(loginResult.attributes);
				}
			}
			this.eventService.emit('user-login-failed', {
				userEmail: loginResult.attributes.email ?? 'unknown',
				authenticationMethod: 'saml',
			});
			// Need to manually send the error response since we're using templates
			return sendErrorResponse(res, new AuthError('SAML Authentication failed'));
		} catch (error) {
			if (isConnectionTestRequest(payload)) {
				return res.render('saml-connection-test-failed', { message: (error as Error).message });
			}
			this.eventService.emit('user-login-failed', {
				userEmail: 'unknown',
				authenticationMethod: 'saml',
			});
			// Need to manually send the error response since we're using templates
			return sendErrorResponse(
				res,
				new AuthError('SAML Authentication failed: ' + (error as Error).message),
			);
		}
	}

	/**
	 * Access URL for implementing SP-init SSO
	 * This endpoint is available if SAML is licensed and enabled
	 */
	@Get('/initsso', { middlewares: [samlLicensedAndEnabledMiddleware], skipAuth: true })
	async initSsoGet(req: AuthlessRequest<{}, {}, {}, { redirect?: string }>, res: Response) {
		let redirectUrl = '';
		try {
			const refererUrl = req.headers.referer;
			if (refererUrl) {
				const parsedUrl = url.parse(refererUrl);
				if (parsedUrl?.query) {
					const parsedQueryParams = querystring.parse(parsedUrl.query);
					if (parsedQueryParams.redirect && typeof parsedQueryParams.redirect === 'string') {
						redirectUrl = querystring.unescape(parsedQueryParams.redirect);
					}
				}
			}
		} catch {
			// ignore
		}
		return await this.handleInitSSO(res, redirectUrl || (req.query.redirect ?? ''));
	}

	/**
	 * Test SAML config
	 * This endpoint is available if SAML is licensed and the requestor is an instance owner
	 */
	@Get('/config/test', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async configTestGet(_: AuthenticatedRequest, res: Response) {
		return await this.handleInitSSO(res, getServiceProviderConfigTestReturnUrl());
	}

	private async handleInitSSO(res: Response, relayState?: string) {
		const result = await this.samlService.getLoginRequestUrl(relayState);
		if (result?.binding === 'redirect') {
			return result.context.context;
		} else if (result?.binding === 'post') {
			return res.send(getInitSSOFormView(result.context as PostBindingContext));
		} else {
			throw new AuthError('SAML redirect failed, please check your SAML configuration.');
		}
	}
}
