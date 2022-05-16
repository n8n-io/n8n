/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express = require('express');
import config = require('../../../../../config');
import { PaginatatedRequest, UserRequest } from '../../../types';
import { decodeCursor } from '../services/pagination.service';

type Role = 'member' | 'owner';

export const authorize =
	(role: Role[]) =>
	(req: express.Request, res: express.Response, next: express.NextFunction): any => {
		const {
			globalRole: { name: userRole },
		} = req.user as { globalRole: { name: Role } };
		if (role.includes(userRole)) {
			return next();
		}
		return res.status(403).json({
			message: 'Unauthorized',
		});
	};

export const validCursor = (
	req: PaginatatedRequest,
	res: express.Response,
	next: express.NextFunction,
): any => {
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
				message: 'An invalid cursor was used',
			});
		}
	}
	next();
};
