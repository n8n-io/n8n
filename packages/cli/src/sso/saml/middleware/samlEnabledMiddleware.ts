import type { RequestHandler } from 'express';
import { isSamlLicensed, isSamlLicensedAndEnabled } from '../samlHelpers';

export const samlLicensedAndEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (isSamlLicensedAndEnabled()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};

export const samlLicensedMiddleware: RequestHandler = (req, res, next) => {
	if (isSamlLicensed()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};
