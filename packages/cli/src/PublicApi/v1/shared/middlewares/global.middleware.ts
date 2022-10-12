/* eslint-disable @typescript-eslint/no-invalid-void-type */

import express from 'express';

import { AuthenticatedRequest, PaginatatedRequest } from '../../../types';
import { decodeCursor } from '../services/pagination.service';

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
	req: PaginatatedRequest,
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
