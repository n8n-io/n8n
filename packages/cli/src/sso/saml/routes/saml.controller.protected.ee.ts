import express from 'express';
import {
	samlLicensedAndEnabledMiddleware,
	samlLicensedOwnerMiddleware,
} from '../middleware/samlEnabledMiddleware';
import { SamlService } from '../saml.service.ee';
import { SamlUrls } from '../constants';
import type { SamlConfiguration } from '../types/requests';
import { AuthError, BadRequestError } from '@/ResponseHelper';
import { issueCookie } from '../../../auth/jwt';
import { validate } from 'class-validator';
import type { PostBindingContext } from 'samlify/types/src/entity';
import { getInitSSOFormView } from '../views/initSsoPost';
import { getInitSSOPostView } from '../views/initSsoRedirect';

export const samlControllerProtected = express.Router();

/**
 * GET /sso/saml/config
 * Return SAML config
 */
samlControllerProtected.get(
	SamlUrls.config,
	samlLicensedOwnerMiddleware,
	(req: SamlConfiguration.Read, res: express.Response) => {
		const prefs = SamlService.getInstance().getSamlPreferences();
		return res.send(prefs);
	},
);

/**
 * POST /sso/saml/config
 * Set SAML config
 */
samlControllerProtected.post(
	SamlUrls.config,
	samlLicensedOwnerMiddleware,
	async (req: SamlConfiguration.Update, res: express.Response) => {
		const validationResult = await validate(req.body);
		if (validationResult.length === 0) {
			const result = await SamlService.getInstance().setSamlPreferences(req.body);
			return res.send(result);
		} else {
			throw new BadRequestError(
				'Body is not a valid SamlPreferences object: ' +
					validationResult.map((e) => e.toString()).join(','),
			);
		}
	},
);

/**
 * POST /sso/saml/config/toggle
 * Set SAML config
 */
samlControllerProtected.post(
	SamlUrls.configToggleEnabled,
	samlLicensedOwnerMiddleware,
	async (req: SamlConfiguration.Toggle, res: express.Response) => {
		if (req.body.loginEnabled !== undefined) {
			await SamlService.getInstance().setSamlPreferences({ loginEnabled: req.body.loginEnabled });
			res.sendStatus(200);
		} else {
			throw new BadRequestError('Body should contain a boolean "loginEnabled" property');
		}
	},
);

/**
 * GET /sso/saml/acs
 * Assertion Consumer Service endpoint
 */
samlControllerProtected.get(
	SamlUrls.acs,
	samlLicensedAndEnabledMiddleware,
	async (req: express.Request, res: express.Response) => {
		const loginResult = await SamlService.getInstance().handleSamlLogin(req, 'redirect');
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
	},
);

/**
 * POST /sso/saml/acs
 * Assertion Consumer Service endpoint
 */
samlControllerProtected.post(
	SamlUrls.acs,
	samlLicensedAndEnabledMiddleware,
	async (req: express.Request, res: express.Response) => {
		const loginResult = await SamlService.getInstance().handleSamlLogin(req, 'post');
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
	},
);

/**
 * GET /sso/saml/initsso
 * Access URL for implementing SP-init SSO
 */
samlControllerProtected.get(
	SamlUrls.initSSO,
	samlLicensedAndEnabledMiddleware,
	async (req: express.Request, res: express.Response) => {
		const result = SamlService.getInstance().getLoginRequestUrl();
		if (result?.binding === 'redirect') {
			// forced client side redirect
			return res.send(getInitSSOPostView(result.context));
			// return res.status(301).send(result.context.context);
		} else if (result?.binding === 'post') {
			return res.send(getInitSSOFormView(result.context as PostBindingContext));
		} else {
			throw new AuthError('SAML redirect failed, please check your SAML configuration.');
		}
	},
);

samlControllerProtected.get(
	SamlUrls.configTest,
	async (req: express.Request, res: express.Response) => {
		const testResult = await SamlService.getInstance().testSamlConnection();
		return res.send(testResult);
	},
);
