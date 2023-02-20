import type { RequestHandler } from 'express';
import { LoggerProxy } from 'n8n-workflow';
import { isSamlCurrentAuthenticationMethod, isSamlEnabled, isSamlLicensed } from '../helpers';

export const samlEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (isSamlEnabled() && isSamlLicensed() && isSamlCurrentAuthenticationMethod()) {
		next();
	} else {
		//TODO:SAML: remove this debug log
		LoggerProxy.debug(
			`SAML middleware denial: isSamlEnabled: ${isSamlEnabled().toString()} // isSamlLicensed: ${isSamlLicensed().toString()} // isSamlCurrentAuthenticationMethod: ${isSamlCurrentAuthenticationMethod().toString()}`,
		);
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};
