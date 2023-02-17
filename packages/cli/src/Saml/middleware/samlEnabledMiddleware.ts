import type { RequestHandler } from 'express';
import { isSamlEnabled } from '../helpers';

export const samlEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (isSamlEnabled()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};
