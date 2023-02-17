import express from 'express';
import { getIdentityProviderInstance } from '../identityProvider.ee';
import { getServiceProviderInstance } from '../serviceProvider.ee';

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
		console.log('parsedSamlResponse: ', parsedSamlResponse.extract);
		// TODO:SAML: fetch mapped attributes from parsedSamlResponse.extract.attributes and create or login user
	}
	return res.status(200).json({});
});

/**
 * GET /sso/metadata
 * Return Service Provider metadata
 */
samlController.get('/metadata', async (req: express.Request, res: express.Response) => {
	return res.header('Content-Type', 'text/xml').send(getServiceProviderInstance().getMetadata());
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
	console.log(loginRequest.context);
	return res.redirect(loginRequest.context);
});
