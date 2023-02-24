import express from 'express';
import { SamlUrls } from '../constants';
import { getServiceProviderInstance } from '../serviceProvider.ee';

/**
 * SSO Endpoints that are public
 */

export const samlControllerPublic = express.Router();

/**
 * GET /sso/saml/metadata
 * Return Service Provider metadata
 */
samlControllerPublic.get(SamlUrls.metadata, async (req: express.Request, res: express.Response) => {
	return res.header('Content-Type', 'text/xml').send(getServiceProviderInstance().getMetadata());
});
