import { InviteUsersRequestDto, RoleChangeRequestDto } from '@n8n/api-types';
import { type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import { toPublicApiUser } from './users.mapper';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
	validLicenseWithUserQuota,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { UserRequest } from '@/requests';
import { ProjectService } from '@/services/project.service.ee';
import { UserService } from '@/services/user.service';

type Create = AuthenticatedRequest<{}, {}, InviteUsersRequestDto>;
type Delete = UserRequest.Delete;
type ChangeRole = AuthenticatedRequest<{ id: string }, {}, RoleChangeRequestDto, {}>;

type UsersHandlers = {
	getUser: PublicAPIEndpoint<UserRequest.Get>;
	getUsers: PublicAPIEndpoint<UserRequest.Get>;
	createUser: PublicAPIEndpoint<Create>;
	deleteUser: PublicAPIEndpoint<Delete>;
	changeRole: PublicAPIEndpoint<ChangeRole>;
};

const usersHandlers: UsersHandlers = {
	getUser: [
		validLicenseWithUserQuota,
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'user:read' }),
		async (req, res) => {
			const { includeRole = false } = req.query;
			const { id } = req.params;

			const user = await Container.get(UserService).getUser(id);

			if (!user) {
				throw new NotFoundError(`Could not find user with id: ${id}`);
			}

			Container.get(EventService).emit('user-retrieved-user', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json(toPublicApiUser(user, { includeRole }));
		},
	],
	getUsers: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'user:list' }),
		validLicenseWithUserQuota,
		validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100, includeRole = false, projectId } = req.query;
			const userService = Container.get(UserService);

			await userService.assertGetUsersAccess(req.user, projectId);

			const userIdsInProject = projectId
				? await Container.get(ProjectService).findUserIdsByProjectId(projectId)
				: undefined;

			const { users, count } = await userService.getUsersAndCount({
				ids: userIdsInProject,
				limit,
				offset,
			});

			Container.get(EventService).emit('user-retrieved-all-users', {
				userId: req.user.id,
				publicApi: true,
			});

			return res.json({
				data: toPublicApiUser(users, { includeRole }),
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	createUser: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'user:create' }),
		async (req, res) => {
			const { data, error } = InviteUsersRequestDto.safeParse(req.body);
			if (error) {
				throw new BadRequestError(error.errors[0]?.message ?? 'Invalid request body');
			}

			const usersInvited = await Container.get(UserService).inviteUser(req.user, data);
			return res.status(201).json(usersInvited);
		},
	],
	deleteUser: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'user:delete' }),
		async (req, res) => {
			await Container.get(UserService).deleteUser(req.user, req.params.id, req.query.transferId);

			return res.status(204).send();
		},
	],
	changeRole: [
		isLicensed('feat:advancedPermissions'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'user:changeRole' }),
		async (req, res) => {
			const validation = RoleChangeRequestDto.safeParse(req.body);
			if (validation.error) {
				throw new BadRequestError(validation.error.errors[0]?.message ?? 'Invalid request body');
			}

			await Container.get(UserService).changeGlobalRole(req.user, req.params.id, validation.data);

			return res.status(204).send();
		},
	],
};

export = usersHandlers;
