import type { RequestHandler } from 'express';

import { isSamlLicensed, isSamlLicensedAndEnabled } from '../saml-helpers';

export const samlLicensedAndEnabledMiddleware: RequestHandler = (_, res, next) => {
	if (isSamlLicensedAndEnabled()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};

export const samlLicensedMiddleware: RequestHandler = (_, res, next) => {
	if (isSamlLicensed()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};
