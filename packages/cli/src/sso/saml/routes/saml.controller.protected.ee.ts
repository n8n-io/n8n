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
import { isSamlPreferences } from '../samlHelpers';

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
 * Return SAML config
 */
samlControllerProtected.post(
	SamlUrls.config,
	samlLicensedOwnerMiddleware,
	async (req: SamlConfiguration.Update, res: express.Response) => {
		if (isSamlPreferences(req.body)) {
			const result = await SamlService.getInstance().setSamlPreferences(req.body);
			return res.send(result);
		} else {
			throw new BadRequestError('Body is not a SamlPreferences object');
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
		const url = SamlService.getInstance().getRedirectLoginRequestUrl();
		if (url) {
			// TODO:SAML: redirect to the URL on the client side
			return res.status(301).send(url);
		} else {
			throw new AuthError('SAML redirect failed, please check your SAML configuration.');
		}
	},
);
