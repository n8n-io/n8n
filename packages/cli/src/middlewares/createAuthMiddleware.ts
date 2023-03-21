import type { RequestHandler } from 'express';
import type { AuthenticatedRequest } from '@/requests';
import type { AuthRole } from '@db/entities/Role';

export const createAuthMiddleware =
	(authRole: AuthRole): RequestHandler =>
	({ user }: AuthenticatedRequest, res, next) => {
		if (authRole === 'none') return next();

		if (!user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

		if (authRole === 'any' || user.globalRole.matches(authRole)) return next();

		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	};
