import { RoleChangeRequestDto } from '@n8n/api-types';
import type express from 'express';
import type { Response } from 'express';
import { Container } from 'typedi';

import { InvitationController } from '@/controllers/invitation.controller';
import { UsersController } from '@/controllers/users.controller';
import { ProjectRelationRepository } from '@/databases/repositories/project-relation.repository';
import { EventService } from '@/events/event.service';
import type { AuthenticatedRequest, UserRequest } from '@/requests';

import { clean, getAllUsersAndCount, getUser } from './users.service.ee';
import {
	globalScope,
	isLicensed,
	validCursor,
	validLicenseWithUserQuota,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type Create = UserRequest.Invite;
type Delete = UserRequest.Delete;
type ChangeRole = AuthenticatedRequest<{ id: string }, {}, RoleChangeRequestDto, {}>;

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

			Container.get(EventService).emit('user-retrieved-user', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json(clean(user, { includeRole }));
		},
	],
	getUsers: [
		validLicenseWithUserQuota,
		validCursor,
		globalScope(['user:list', 'user:read']),
		async (req: UserRequest.Get, res: express.Response) => {
			const { offset = 0, limit = 100, includeRole = false, projectId } = req.query;

			const _in = projectId
				? await Container.get(ProjectRelationRepository).findUserIdsByProjectId(projectId)
				: undefined;

			const [users, count] = await getAllUsersAndCount({
				includeRole,
				limit,
				offset,
				in: _in,
			});

			Container.get(EventService).emit('user-retrieved-all-users', {
				userId: req.user.id,
				publicApi: true,
			});

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
	createUser: [
		globalScope('user:create'),
		async (req: Create, res: Response) => {
			const usersInvited = await Container.get(InvitationController).inviteUser(req);

			return res.status(201).json(usersInvited);
		},
	],
	deleteUser: [
		globalScope('user:delete'),
		async (req: Delete, res: Response) => {
			await Container.get(UsersController).deleteUser(req);

			return res.status(204).send();
		},
	],
	changeRole: [
		isLicensed('feat:advancedPermissions'),
		globalScope('user:changeRole'),
		async (req: ChangeRole, res: Response) => {
			const validation = RoleChangeRequestDto.safeParse(req.body);
			if (validation.error) {
				return res.status(400).json({
					message: validation.error.errors[0],
				});
			}

			await Container.get(UsersController).changeGlobalRole(
				req,
				res,
				validation.data,
				req.params.id,
			);

			return res.status(204).send();
		},
	],
};
