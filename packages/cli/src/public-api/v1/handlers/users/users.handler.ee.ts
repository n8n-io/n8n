import { InviteUsersRequestDto, RoleChangeRequestDto } from '@n8n/api-types';
import { type AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { UserRequest } from '@/requests';
import { UserService } from '@/services/user.service';

type Create = AuthenticatedRequest<{}, {}, InviteUsersRequestDto>;
type Delete = UserRequest.Delete;
type ChangeRole = AuthenticatedRequest<{ id: string }, {}, RoleChangeRequestDto, {}>;

type UsersHandlers = {
	createUser: PublicAPIEndpoint<Create>;
	deleteUser: PublicAPIEndpoint<Delete>;
	changeRole: PublicAPIEndpoint<ChangeRole>;
};

const usersHandlers: UsersHandlers = {
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
