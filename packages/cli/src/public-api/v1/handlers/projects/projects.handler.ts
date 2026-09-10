import { AddUsersToProjectDto, ChangeUserRoleInProject } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import pick from 'lodash/pick';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { PaginatedRequest } from '@/public-api/types';
import { ProjectService } from '@/services/project.service.ee';

type GetProjectUsersRequest = AuthenticatedRequest<{ projectId: string }> & PaginatedRequest;

type ProjectHandlers = {
	getProjectUsers: PublicAPIEndpoint<GetProjectUsersRequest>;
	addUsersToProject: PublicAPIEndpoint<AuthenticatedRequest<{ projectId: string }>>;
	changeUserRoleInProject: PublicAPIEndpoint<
		AuthenticatedRequest<{ projectId: string; userId: string }>
	>;
	deleteUserFromProject: PublicAPIEndpoint<
		AuthenticatedRequest<{ projectId: string; userId: string }>
	>;
};

/** Mirrors the ProjectController guard: manual membership changes are disallowed when roles are provisioned. */
async function assertProjectRolesNotManaged() {
	if (await Container.get(ProvisioningService).isProjectRoleManaged()) {
		throw new ForbiddenError(
			'Project roles are managed automatically and cannot be changed manually',
		);
	}
}

const projectHandlers: ProjectHandlers = {
	getProjectUsers: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'user:list' }),
		validCursor,
		async (req, res) => {
			const { projectId } = req.params;
			const offset = Number(req.query.offset) || 0;
			const limit = Number(req.query.limit) || 100;

			const projectService = Container.get(ProjectService);
			const project = await projectService.getProjectWithScope(req.user, projectId, [
				'project:list',
			]);
			if (!project) {
				throw new NotFoundError(`Could not find project with ID "${projectId}"`);
			}

			const { members, count } = await projectService.getProjectMembersAndCount(projectId, {
				offset,
				limit,
			});

			const memberFields = [
				'id',
				'email',
				'firstName',
				'lastName',
				'createdAt',
				'updatedAt',
			] as const;
			const data = members.map((relation) => ({
				...pick(relation.user, memberFields),
				role: relation.role?.slug ?? null,
			}));

			return res.json({
				data,
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
	addUsersToProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:manageMembers' }),
		async (req, res) => {
			await assertProjectRolesNotManaged();

			const payload = AddUsersToProjectDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			await Container.get(ProjectService).addUsersToProject(
				req.user,
				req.params.projectId,
				payload.data.relations,
			);

			return res.status(201).send();
		},
	],
	changeUserRoleInProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:manageMembers' }),
		async (req, res) => {
			await assertProjectRolesNotManaged();

			const payload = ChangeUserRoleInProject.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			const { projectId, userId } = req.params;
			const { role } = payload.data;
			await Container.get(ProjectService).changeUserRoleInProject(
				req.user,
				projectId,
				userId,
				role,
			);

			return res.status(204).send();
		},
	],
	deleteUserFromProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:manageMembers' }),
		async (req, res) => {
			await assertProjectRolesNotManaged();

			const { projectId, userId } = req.params;

			await Container.get(ProjectService).deleteUserFromProject(req.user, projectId, userId);

			return res.status(204).send();
		},
	],
};

export = projectHandlers;
