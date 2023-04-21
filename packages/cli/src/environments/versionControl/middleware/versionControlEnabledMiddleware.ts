import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '@/requests';
import {
	isVersionControlLicensed,
	isVersionControlLicensedAndEnabled,
} from '../versionControlHelper';

export const versionControlLicensedOwnerMiddleware: RequestHandler = (
	req: AuthenticatedRequest,
	res,
	next,
) => {
	if (isVersionControlLicensed() && req.user?.globalRole.name === 'owner') {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};

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
