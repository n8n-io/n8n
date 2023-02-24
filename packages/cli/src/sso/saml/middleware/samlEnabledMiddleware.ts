import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../../../requests';
import { isSamlCurrentAuthenticationMethod } from '../../ssoHelpers';
import { isSamlEnabled, isSamlLicensed } from '../samlHelpers';

export const samlLicensedOwnerMiddleware: RequestHandler = (
	req: AuthenticatedRequest,
	res,
	next,
) => {
	if (isSamlLicensed() && req.user?.globalRole.name === 'owner') {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};

export const samlLicensedAndEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (isSamlEnabled() && isSamlLicensed() && isSamlCurrentAuthenticationMethod()) {
		next();
	} else {
		res.status(401).json({ status: 'error', message: 'Unauthorized' });
	}
};
