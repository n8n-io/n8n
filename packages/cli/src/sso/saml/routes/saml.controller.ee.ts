import { validate } from 'class-validator';
import express from 'express';
import querystring from 'querystring';
import type { PostBindingContext } from 'samlify/types/src/entity';
import url from 'url';

import { AuthService } from '@/auth/auth.service';
import { Get, Post, RestController, GlobalScope } from '@/decorators';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { EventService } from '@/events/event.service';
import { AuthenticatedRequest } from '@/requests';
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
import { SamlConfiguration } from '../types/requests';
import { getInitSSOFormView } from '../views/init-sso-post';
import { getSamlConnectionTestFailedView } from '../views/saml-connection-test-failed';
import { getSamlConnectionTestSuccessView } from '../views/saml-connection-test-success';

@RestController('/sso/saml')
export class SamlController {
	constructor(
		private readonly authService: AuthService,
		private readonly samlService: SamlService,
		private readonly urlService: UrlService,
		private readonly eventService: EventService,
	) {}

	@Get('/metadata', { skipAuth: true })
	async getServiceProviderMetadata(_: express.Request, res: express.Response) {
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
	async configPost(req: SamlConfiguration.Update) {
		const validationResult = await validate(req.body);
		if (validationResult.length === 0) {
			const result = await this.samlService.setSamlPreferences(req.body);
			return result;
		} else {
			throw new BadRequestError(
				'Body is not a valid SamlPreferences object: ' +
					validationResult.map((e) => e.toString()).join(','),
			);
		}
	}

	/**
	 * Toggle SAML status
	 */
	@Post('/config/toggle', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async toggleEnabledPost(req: SamlConfiguration.Toggle, res: express.Response) {
		if (req.body.loginEnabled === undefined) {
			throw new BadRequestError('Body should contain a boolean "loginEnabled" property');
		}
		await this.samlService.setSamlPreferences({ loginEnabled: req.body.loginEnabled });
		return res.sendStatus(200);
	}

	/**
	 * Assertion Consumer Service endpoint
	 */
	@Get('/acs', { middlewares: [samlLicensedMiddleware], skipAuth: true })
	async acsGet(req: SamlConfiguration.AcsRequest, res: express.Response) {
		return await this.acsHandler(req, res, 'redirect');
	}

	/**
	 * Assertion Consumer Service endpoint
	 */
	@Post('/acs', { middlewares: [samlLicensedMiddleware], skipAuth: true })
	async acsPost(req: SamlConfiguration.AcsRequest, res: express.Response) {
		return await this.acsHandler(req, res, 'post');
	}

	/**
	 * Handles the ACS endpoint for both GET and POST requests
	 * Available if SAML is licensed, even if not enabled to run connection tests
	 * For test connections, returns status 202 if SAML is not enabled
	 */
	private async acsHandler(
		req: SamlConfiguration.AcsRequest,
		res: express.Response,
		binding: SamlLoginBinding,
	) {
		try {
			const loginResult = await this.samlService.handleSamlLogin(req, binding);
			// if RelayState is set to the test connection Url, this is a test connection
			if (isConnectionTestRequest(req)) {
				if (loginResult.authenticatedUser) {
					return res.send(getSamlConnectionTestSuccessView(loginResult.attributes));
				} else {
					return res.send(getSamlConnectionTestFailedView('', loginResult.attributes));
				}
			}
			if (loginResult.authenticatedUser) {
				this.eventService.emit('user-logged-in', {
					user: loginResult.authenticatedUser,
					authenticationMethod: 'saml',
				});

				// Only sign in user if SAML is enabled, otherwise treat as test connection
				if (isSamlLicensedAndEnabled()) {
					this.authService.issueCookie(res, loginResult.authenticatedUser, req.browserId);
					if (loginResult.onboardingRequired) {
						return res.redirect(this.urlService.getInstanceBaseUrl() + '/saml/onboarding');
					} else {
						const redirectUrl = req.body?.RelayState ?? '/';
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
			throw new AuthError('SAML Authentication failed');
		} catch (error) {
			if (isConnectionTestRequest(req)) {
				return res.send(getSamlConnectionTestFailedView((error as Error).message));
			}
			this.eventService.emit('user-login-failed', {
				userEmail: 'unknown',
				authenticationMethod: 'saml',
			});
			throw new AuthError('SAML Authentication failed: ' + (error as Error).message);
		}
	}

	/**
	 * Access URL for implementing SP-init SSO
	 * This endpoint is available if SAML is licensed and enabled
	 */
	@Get('/initsso', { middlewares: [samlLicensedAndEnabledMiddleware], skipAuth: true })
	async initSsoGet(req: express.Request, res: express.Response) {
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
		return await this.handleInitSSO(res, redirectUrl);
	}

	/**
	 * Test SAML config
	 * This endpoint is available if SAML is licensed and the requestor is an instance owner
	 */
	@Get('/config/test', { middlewares: [samlLicensedMiddleware] })
	@GlobalScope('saml:manage')
	async configTestGet(_: AuthenticatedRequest, res: express.Response) {
		return await this.handleInitSSO(res, getServiceProviderConfigTestReturnUrl());
	}

	private async handleInitSSO(res: express.Response, relayState?: string) {
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
