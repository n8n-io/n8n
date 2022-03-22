import express = require('express');
import { getConnection } from 'typeorm';

import { UserRequest } from '../../../../requests';

import { User } from '../../../../databases/entities/User';
import { decodeCursor, getNextCursor, getSelectableProperties } from '../../../helpers';

import * as config from '../../../../../config';

export = {
	createUsers: async (req: UserRequest.Invite, res: express.Response) => {
		res.json({ success: true });
	},
	deleteUser: async (req: UserRequest.Delete, res: express.Response) => {
		res.json({ success: true });
	},
	getUser: async (req: UserRequest.Get, res: express.Response) => {
		res.json({ success: true });
	},
	getUsers: async (req: UserRequest.Get, res: express.Response) => {
		let offset = 0;
		let limit = parseInt(req.query.limit as string, 10) || 10;
		const includeRole = req.query?.includeRole?.toLowerCase() === 'true' || false;

		if (req.query.cursor) {
			const cursor = req.query.cursor as string;
			({ offset, limit } = decodeCursor(cursor));
		}

		const query = getConnection()
			.getRepository(User)
			.createQueryBuilder()
			.leftJoinAndSelect('User.globalRole', 'Role')
			.select(getSelectableProperties('user')!.map(property => `User.${property}`))
			.limit(limit)
			.offset(offset);

		if (includeRole) {
			query.addSelect(getSelectableProperties('role')!.map(property => `Role.${property}`));
		}

		const [users, count] = await query.getManyAndCount();

		res.json({
			users,
			nextCursor: getNextCursor(offset, limit, count),
		});
	},
}; 
