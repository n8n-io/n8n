import type { RequestHandler } from 'express';
import { LoggerProxy } from 'n8n-workflow';
import { isUserManagementEnabled } from '../UserManagement/UserManagementHelper';

export const userManagementEnabledMiddleware: RequestHandler = (req, res, next) => {
	if (isUserManagementEnabled()) {
		next();
	} else {
		LoggerProxy.debug('Request failed because user management is disabled');
		res.status(400).json({ status: 'error', message: 'User management is disabled' });
	}
};
