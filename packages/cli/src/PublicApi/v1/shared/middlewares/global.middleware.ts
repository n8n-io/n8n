/* eslint-disable consistent-return */
import { RequestHandler } from 'express';
import { PaginatatedRequest } from '../../../types';
import { decodeCursor } from '../services/pagination.service';

type Role = 'member' | 'owner';

export const authorize: (role: Role[]) => RequestHandler = (role: Role[]) => (req, res, next) => {
	const {
		globalRole: { name: userRole },
	} = req.user as { globalRole: { name: Role } };
	if (role.includes(userRole)) {
		return next();
	}
	return res.status(403).json({
		message: 'Forbidden',
	});
};

// @ts-ignore
export const validCursor: RequestHandler = (req: PaginatatedRequest, res, next) => {
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
	next();
};
