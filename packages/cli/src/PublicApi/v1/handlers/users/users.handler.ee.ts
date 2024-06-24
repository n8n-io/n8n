import type express from 'express';
import { Container } from 'typedi';

import { clean, getAllUsersAndCount, getUser } from './users.service.ee';

import { encodeNextCursor } from '../../shared/services/pagination.service';
import {
	globalScope,
	validCursor,
	validLicenseWithUserQuota,
} from '../../shared/middlewares/global.middleware';
import type { UserRequest } from '@/requests';
import { InternalHooks } from '@/InternalHooks';
import { EventRelay } from '@/eventbus/event-relay.service';

export = {
	getUser: [
		validLicenseWithUserQuota,
		globalScope('user:read'),
		async (req: UserRequest.Get, res: express.Response) => {
			const { includeRole = false } = req.query;
			const { id } = req.params;

			const user = await getUser({ withIdentifier: id, includeRole });

			if (!user) {
				return res.status(404).json({
					message: `Could not find user with id: ${id}`,
				});
			}

			void Container.get(EventRelay).emit('user-retrieved-user', { user });

			return res.json(clean(user, { includeRole }));
		},
	],
	getUsers: [
		validLicenseWithUserQuota,
		validCursor,
		globalScope(['user:list', 'user:read']),
		async (req: UserRequest.Get, res: express.Response) => {
			const { offset = 0, limit = 100, includeRole = false } = req.query;

			const [users, count] = await getAllUsersAndCount({
				includeRole,
				limit,
				offset,
			});

			void Container.get(EventRelay).emit('user-retrieved-all-users', { user: req.user });

			return res.json({
				data: clean(users, { includeRole }),
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
};
