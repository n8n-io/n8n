import type { RequestHandler } from 'express';
import {
	isVersionControlLicensed,
	isVersionControlLicensedAndEnabled,
} from '../versionControlHelper';

export const versionControlLicensedAndEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (isVersionControlLicensedAndEnabled()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};

export const versionControlLicensedMiddleware: RequestHandler = (req, res, next) => {
	if (isVersionControlLicensed()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};
