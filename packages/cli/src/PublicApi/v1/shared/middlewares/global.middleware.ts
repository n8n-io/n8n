/* eslint-disable @typescript-eslint/no-invalid-void-type */
import type express from 'express';
import { Container } from 'typedi';

import { License } from '@/License';
import type { GlobalRole } from '@db/entities/User';
import type { AuthenticatedRequest } from '@/requests';

import type { PaginatedRequest } from '../../../types';
import { decodeCursor } from '../services/pagination.service';

const UNLIMITED_USERS_QUOTA = -1;

export const authorize =
	(authorizedRoles: readonly GlobalRole[]) =>
	(
		req: AuthenticatedRequest,
		res: express.Response,
		next: express.NextFunction,
	): express.Response | void => {
		if (!authorizedRoles.includes(req.user.role)) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		return next();
	};

export const validCursor = (
	req: PaginatedRequest,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	if (req.query.cursor) {
		const { cursor } = req.query;
		try {
			const paginationData = decodeCursor(cursor);
			if ('offset' in paginationData) {
				req.query.offset = paginationData.offset;
				req.query.limit = paginationData.limit;
			} else {
				req.query.lastId = paginationData.lastId;
				req.query.limit = paginationData.limit;
			}
		} catch (error) {
			return res.status(400).json({
				message: 'An invalid cursor was provided',
			});
		}
	}

	return next();
};

export const validLicenseWithUserQuota = (
	_: express.Request,
	res: express.Response,
	next: express.NextFunction,
): express.Response | void => {
	const license = Container.get(License);
	if (license.getUsersLimit() !== UNLIMITED_USERS_QUOTA) {
		return res.status(403).json({
			message: '/users path can only be used with a valid license. See https://n8n.io/pricing/',
		});
	}

	return next();
};
