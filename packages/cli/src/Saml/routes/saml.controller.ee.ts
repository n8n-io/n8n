import express from 'express';
import * as Db from '@/Db';
import { issueCookie } from '@/auth/jwt';
import { LoggerProxy } from 'n8n-workflow';
import { getIdentityProviderInstance } from '../identityProvider.ee';
import { getServiceProviderInstance } from '../serviceProvider.ee';
import { SamlAttributeMapping } from '../types/samlAttributeMapping';
import { AuthError } from '@/ResponseHelper';

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
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	if (parsedSamlResponse?.extract?.attributes) {
		// TODO: remove, but keep for manual testing for now
		LoggerProxy.debug(JSON.stringify(parsedSamlResponse.extract));
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const attributes = parsedSamlResponse.extract.attributes as { [key: string]: string };
		// TODO:SAML: fetch mapped attributes from parsedSamlResponse.extract.attributes and create or login user
		const email = attributes[SamlAttributeMapping.email];
		const firstName = attributes[SamlAttributeMapping.firstName];
		const lastName = attributes[SamlAttributeMapping.lastName];
		const userPrincipalName = attributes[SamlAttributeMapping.userPrincipalName];

		if (email) {
			const user = await Db.collections.User.findOne({
				where: { email },
				relations: ['globalRole', 'authIdentities'],
			});

			if (
				user &&
				(user?.globalRole?.name === 'owner' ||
					user.authIdentities.find(
						(e) => e.providerType === 'saml' && e.providerId === userPrincipalName,
					))
			) {
				await issueCookie(res, user);
				return res.redirect('/');
			}

			// if (user?.globalRole?.name === 'owner') {
			// 	res.redirect('/signin');
			// }
		}

		const attributesErrors = [];
		if (!email) attributesErrors.push(SamlAttributeMapping.email);
		if (!userPrincipalName) attributesErrors.push(SamlAttributeMapping.userPrincipalName);
		if (!firstName) attributesErrors.push(SamlAttributeMapping.firstName);
		if (!lastName) attributesErrors.push(SamlAttributeMapping.lastName);
		throw new AuthError(
			`SAML Authentication failed. ${
				attributesErrors ? 'Missing or invalid attributes: ' + attributesErrors.join(', ') : ''
			}`,
		);
	}
	throw new AuthError('SAML Authentication failed. Invalid SAML response (missing attributes).');
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
