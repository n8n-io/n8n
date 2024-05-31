import type { RequestHandler } from 'express';
import Container from 'typedi';
import { License } from '../../License';

export function islogStreamingLicensed(): boolean {
	return Container.get(License).isLogStreamingEnabled();
}

export const logStreamingLicensedMiddleware: RequestHandler = (_req, res, next) => {
	if (islogStreamingLicensed()) {
		next();
	} else {
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	}
};
