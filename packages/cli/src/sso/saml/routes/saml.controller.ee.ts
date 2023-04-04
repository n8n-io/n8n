import express from 'express';
import { Get, Post, RestController } from '@/decorators';
import { SamlUrls } from '../constants';
import {
	samlLicensedAndEnabledMiddleware,
	samlLicensedMiddleware,
	samlLicensedOwnerMiddleware,
} from '../middleware/samlEnabledMiddleware';
import { SamlService } from '../saml.service.ee';
import { SamlConfiguration } from '../types/requests';
import { AuthError, BadRequestError } from '@/ResponseHelper';
import { getInitSSOFormView } from '../views/initSsoPost';
import { issueCookie } from '@/auth/jwt';
import { validate } from 'class-validator';
import type { PostBindingContext } from 'samlify/types/src/entity';
import { isSamlLicensedAndEnabled } from '../samlHelpers';
import type { SamlLoginBinding } from '../types';
import { AuthenticatedRequest } from '@/requests';
import {
	getServiceProviderConfigTestReturnUrl,
	getServiceProviderEntityId,
	getServiceProviderReturnUrl,
} from '../serviceProvider.ee';

@RestController('/sso/saml')
export class SamlController {
	constructor(private samlService: SamlService) {}

	@Get(SamlUrls.metadata)
	async getServiceProviderMetadata(req: express.Request, res: express.Response) {
		return res
			.header('Content-Type', 'text/xml')
			.send(this.samlService.getServiceProviderInstance().getMetadata());
	}

	/**
	 * GET /sso/saml/config
	 * Return SAML config
	 */
	@Get(SamlUrls.config, { middlewares: [samlLicensedOwnerMiddleware] })
	async configGet() {
		const prefs = this.samlService.samlPreferences;
		return {
			...prefs,
			entityID: getServiceProviderEntityId(),
			returnUrl: getServiceProviderReturnUrl(),
		};
	}

	/**
	 * POST /sso/saml/config
	 * Set SAML config
	 */
	@Post(SamlUrls.config, { middlewares: [samlLicensedOwnerMiddleware] })
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
	 * POST /sso/saml/config/toggle
	 * Set SAML config
	 */
	@Post(SamlUrls.configToggleEnabled, { middlewares: [samlLicensedOwnerMiddleware] })
	async toggleEnabledPost(req: SamlConfiguration.Toggle, res: express.Response) {
		if (req.body.loginEnabled === undefined) {
			throw new BadRequestError('Body should contain a boolean "loginEnabled" property');
		}
		await this.samlService.setSamlPreferences({ loginEnabled: req.body.loginEnabled });
		return res.sendStatus(200);
	}

	/**
	 * GET /sso/saml/acs
	 * Assertion Consumer Service endpoint
	 */
	@Get(SamlUrls.acs, { middlewares: [samlLicensedMiddleware] })
	async acsGet(req: express.Request, res: express.Response) {
		return this.acsHandler(req, res, 'redirect');
	}

	/**
	 * POST /sso/saml/acs
	 * Assertion Consumer Service endpoint
	 */
	@Post(SamlUrls.acs, { middlewares: [samlLicensedMiddleware] })
	async acsPost(req: express.Request, res: express.Response) {
		return this.acsHandler(req, res, 'post');
	}

	/**
	 * Handles the ACS endpoint for both GET and POST requests
	 * Available if SAML is licensed, even if not enabled to run connection tests
	 * For test connections, returns status 202 if SAML is not enabled
	 */
	private async acsHandler(req: express.Request, res: express.Response, binding: SamlLoginBinding) {
		const loginResult = await this.samlService.handleSamlLogin(req, binding);
		if (loginResult) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (req.body.RelayState && req.body.RelayState === getServiceProviderConfigTestReturnUrl()) {
				return res.status(202).send(loginResult.attributes);
			}
			if (loginResult.authenticatedUser) {
				// Only sign in user if SAML is enabled, otherwise treat as test connection
				if (isSamlLicensedAndEnabled()) {
					await issueCookie(res, loginResult.authenticatedUser);
					if (loginResult.onboardingRequired) {
						return res.redirect(SamlUrls.samlOnboarding);
					} else {
						return res.redirect(SamlUrls.defaultRedirect);
					}
				} else {
					return res.status(202).send(loginResult.attributes);
				}
			}
		}
		throw new AuthError('SAML Authentication failed');
	}

	/**
	 * GET /sso/saml/initsso
	 * Access URL for implementing SP-init SSO
	 * This endpoint is available if SAML is licensed and enabled
	 */
	@Get(SamlUrls.initSSO, { middlewares: [samlLicensedAndEnabledMiddleware] })
	async initSsoGet(req: express.Request, res: express.Response) {
		return this.handleInitSSO(res);
	}

	/**
	 * GET /sso/saml/config/test
	 * Test SAML config
	 * This endpoint is available if SAML is licensed and the requestor is an instance owner
	 */
	@Get(SamlUrls.configTest, { middlewares: [samlLicensedOwnerMiddleware] })
	async configTestGet(req: AuthenticatedRequest, res: express.Response) {
		return this.handleInitSSO(res, getServiceProviderConfigTestReturnUrl());
	}

	private async handleInitSSO(res: express.Response, relayState?: string) {
		const result = this.samlService.getLoginRequestUrl(relayState);
		if (result?.binding === 'redirect') {
			return result.context.context;
		} else if (result?.binding === 'post') {
			return res.send(getInitSSOFormView(result.context as PostBindingContext));
		} else {
			throw new AuthError('SAML redirect failed, please check your SAML configuration.');
		}
	}
}
