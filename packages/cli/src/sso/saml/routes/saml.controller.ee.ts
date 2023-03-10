import express from 'express';
import { Get, Post, RestController } from '../../../decorators';
import { SamlUrls } from '../constants';
import {
	samlLicensedAndEnabledMiddleware,
	samlLicensedOwnerMiddleware,
} from '../middleware/samlEnabledMiddleware';
import { SamlService } from '../saml.service.ee';
import { SamlConfiguration } from '../types/requests';
import { AuthError, BadRequestError } from '../../../ResponseHelper';
import { getInitSSOFormView } from '../views/initSsoPost';
import { getInitSSOPostView } from '../views/initSsoRedirect';
import { issueCookie } from '../../../auth/jwt';
import { validate } from 'class-validator';
import type { PostBindingContext } from 'samlify/types/src/entity';

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
	async configGet(req: SamlConfiguration.Read, res: express.Response) {
		const prefs = this.samlService.samlPreferences;
		return res.send(prefs);
	}

	/**
	 * POST /sso/saml/config
	 * Set SAML config
	 */
	@Post(SamlUrls.config, { middlewares: [samlLicensedOwnerMiddleware] })
	async configPost(req: SamlConfiguration.Update, res: express.Response) {
		const validationResult = await validate(req.body);
		if (validationResult.length === 0) {
			const result = await this.samlService.setSamlPreferences(req.body);
			return res.send(result);
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
	@Get(SamlUrls.acs, { middlewares: [samlLicensedAndEnabledMiddleware] })
	async acsGet(req: express.Request, res: express.Response) {
		const loginResult = await this.samlService.handleSamlLogin(req, 'redirect');
		if (loginResult) {
			if (loginResult.authenticatedUser) {
				await issueCookie(res, loginResult.authenticatedUser);
				if (loginResult.onboardingRequired) {
					return res.redirect(SamlUrls.samlOnboarding);
				} else {
					return res.redirect(SamlUrls.defaultRedirect);
				}
			}
		}
		throw new AuthError('SAML Authentication failed');
	}

	/**
	 * POST /sso/saml/acs
	 * Assertion Consumer Service endpoint
	 */
	@Post(SamlUrls.acs, { middlewares: [samlLicensedAndEnabledMiddleware] })
	async acsPost(req: express.Request, res: express.Response) {
		const loginResult = await this.samlService.handleSamlLogin(req, 'post');
		if (loginResult) {
			if (loginResult.authenticatedUser) {
				await issueCookie(res, loginResult.authenticatedUser);
				if (loginResult.onboardingRequired) {
					return res.redirect(SamlUrls.samlOnboarding);
				} else {
					return res.redirect(SamlUrls.defaultRedirect);
				}
			}
		}
		throw new AuthError('SAML Authentication failed');
	}

	/**
	 * GET /sso/saml/initsso
	 * Access URL for implementing SP-init SSO
	 */
	@Get(SamlUrls.initSSO, { middlewares: [samlLicensedAndEnabledMiddleware] })
	async initSsoGet(req: express.Request, res: express.Response) {
		const result = this.samlService.getLoginRequestUrl();
		if (result?.binding === 'redirect') {
			// forced client side redirect through the use of a javascript redirect
			return res.send(getInitSSOPostView(result.context));
			// TODO:SAML: If we want the frontend to handle the redirect, we will send the redirect URL instead:
			// return res.status(301).send(result.context.context);
		} else if (result?.binding === 'post') {
			return res.send(getInitSSOFormView(result.context as PostBindingContext));
		} else {
			throw new AuthError('SAML redirect failed, please check your SAML configuration.');
		}
	}

	/**
	 * GET /sso/saml/config/test
	 * Test SAML config
	 */
	@Get(SamlUrls.configTest, { middlewares: [samlLicensedOwnerMiddleware] })
	async configTestGet(req: express.Request, res: express.Response) {
		const testResult = await this.samlService.testSamlConnection();
		return res.send(testResult);
	}
}
