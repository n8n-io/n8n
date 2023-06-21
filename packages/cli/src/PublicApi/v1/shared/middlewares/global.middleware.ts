/* eslint-disable @typescript-eslint/no-invalid-void-type */

import type express from 'express';
import { Container } from 'typedi';

import type { AuthenticatedRequest, PaginatedRequest } from '../../../types';
import { decodeCursor } from '../services/pagination.service';
import { License } from '@/License';

const UNLIMITED_USERS_QUOTA = -1;

export const authorize =
	(authorizedRoles: readonly string[]) =>
	(
		req: AuthenticatedRequest,
		res: express.Response,
		next: express.NextFunction,
	): express.Response | void => {
		const { name } = req.user.globalRole;

		if (!authorizedRoles.includes(name)) {
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
	req: express.Request,
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
