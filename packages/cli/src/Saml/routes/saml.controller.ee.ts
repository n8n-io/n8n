import express from 'express';
import { LoggerProxy } from 'n8n-workflow';
import { getIdentityProviderInstance } from '../identityProvider.ee';
import { getServiceProviderInstance } from '../serviceProvider.ee';

/**
 * SSO Endpoints that are protected by the checkFeaturesMiddleware and will
 */

export const samlController = express.Router();

/**
 * POST /sso/acs
 * Assertion Consumer Service endpoint
 */
samlController.post('/acs', async (req: express.Request, res: express.Response) => {
	const parsedSamlResponse = await getServiceProviderInstance().parseLoginResponse(
		getIdentityProviderInstance(),
		'post',
		req,
	);
	if (parsedSamlResponse) {
		// TODO: remove, but keep for manual testing for now
		LoggerProxy.debug(JSON.stringify(parsedSamlResponse.extract));
		// TODO:SAML: fetch mapped attributes from parsedSamlResponse.extract.attributes and create or login user
	}
	return res.status(200).json({});
});

/**
 * GET /sso/spinitsso-redirect
 * Access URL for implementing SP-init SSO
 */
samlController.get('/spinitsso-redirect', async (req: express.Request, res: express.Response) => {
	const loginRequest = getServiceProviderInstance().createLoginRequest(
		getIdentityProviderInstance(),
		'redirect',
	);
	// TODO: remove, but keep for manual testing for now
	LoggerProxy.debug(JSON.stringify(loginRequest));
	return res.redirect(loginRequest.context);
});
