import express from 'express';
import { AuthError } from '../../../ResponseHelper';
import { SamlUrls } from '../constants';
import { SamlService } from '../saml.service.ee';
import { isSamlLicensed } from '../samlHelpers';
import { getServiceProviderInstance } from '../serviceProvider.ee';
import type { SamlConfiguration } from '../types/requests';

/**
 * SSO Endpoints that are not protected by the checkFeaturesMiddleware
 */

export const samlControllerPublic = express.Router();

/**
 * GET /sso/saml/metadata
 * Return Service Provider metadata
 */
samlControllerPublic.get(SamlUrls.metadata, async (req: express.Request, res: express.Response) => {
	return res.header('Content-Type', 'text/xml').send(getServiceProviderInstance().getMetadata());
});

/**
 * GET /sso/saml/config
 * Return SAML config
 */
samlControllerPublic.get(
	SamlUrls.config,
	async (req: SamlConfiguration.Read, res: express.Response) => {
		if (!isSamlLicensed()) {
			throw new AuthError('SAML is not licensed');
		}
		if (req.user) {
			const prefs = await SamlService.getInstance().getSamlPreferences();
			return res.send(prefs);
		} else {
			throw new AuthError('User is not authorized to read SAML config');
		}
	},
);

/**
 * POST /sso/saml/config
 * Return SAML config
 */
samlControllerPublic.post(
	SamlUrls.config,
	async (req: SamlConfiguration.Update, res: express.Response) => {
		if (!isSamlLicensed()) {
			throw new AuthError('SAML is not licensed');
		}
		if (req.user.globalRole.name === 'owner') {
			const result = await SamlService.getInstance().setSamlPreferences({
				metadata: req.body.metadata,
				mapping: req.body.mapping,
			});
			return res.send(result);
		} else {
			throw new AuthError('User is not authorized to update SAML config');
		}
	},
);
