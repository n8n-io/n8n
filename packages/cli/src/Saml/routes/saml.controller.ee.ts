import express from 'express';
import { getIdentityProviderInstance } from '../identityProvider.ee';
import { getServiceProviderInstance } from '../serviceProvider.ee';

export const samlController = express.Router();

/**
 * POST /sso/acs
 */
samlController.post('/acs', async (req: express.Request, res: express.Response) => {
	return res.status(200).json({});
});

/**
 * GET /sso/metadata
 */
samlController.get('/metadata', async (req: express.Request, res: express.Response) => {
	return res.header('Content-Type', 'text/xml').send(getServiceProviderInstance().getMetadata());
});

/**
 * GET /sso/spinitsso-redirect
 * Access URL for implementing SP-init SSO
 */
samlController.get('/spinitsso-redirect', async (req: express.Request, res: express.Response) => {
	const { context } = getServiceProviderInstance().createLoginRequest(
		getIdentityProviderInstance(),
		'redirect',
	);
	return res.redirect(context);
});
