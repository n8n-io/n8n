import type { RequestHandler } from 'express';
import { LoggerProxy } from 'n8n-workflow';
import type { AuthenticatedRequest } from '@/requests';

export const isOwnerMiddleware: RequestHandler = (req: AuthenticatedRequest, res, next) => {
	if (req.user.globalRole.name === 'owner') {
		next();
	} else {
		LoggerProxy.debug('Request failed because user is not owner');
		res.status(401).send('Unauthorized');
	}
};
