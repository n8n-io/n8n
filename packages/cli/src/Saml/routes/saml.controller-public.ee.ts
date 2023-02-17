import express from 'express';
import { getServiceProviderInstance } from '../serviceProvider.ee';

/**
 * SSO Endpoints that are not protected by the checkFeaturesMiddleware
 */

export const samlControllerPublic = express.Router();

/**
 * GET /sso/metadata
 * Return Service Provider metadata
 */
samlControllerPublic.get('/metadata', async (req: express.Request, res: express.Response) => {
	return res.header('Content-Type', 'text/xml').send(getServiceProviderInstance().getMetadata());
});
