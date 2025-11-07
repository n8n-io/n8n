import {
	AddUsersToProjectDto,
	ChangeUserRoleInProject,
	CreateProjectDto,
	DeleteProjectDto,
	UpdateProjectWithRelationsDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { ProjectController } from '@/controllers/project.controller';
import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import type { PaginatedRequest } from '@/public-api/types';
import { ProjectService } from '@/services/project.service.ee';

import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type GetAll = PaginatedRequest;
export = {
	createProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:create' }),
		async (req: AuthenticatedRequest, res: Response) => {
			const payload = CreateProjectDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}

			const project = await Container.get(ProjectController).createProject(req, res, payload.data);

			return res.status(201).json(project);
		},
	],
	updateProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
			const payload = UpdateProjectWithRelationsDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}

			await Container.get(ProjectController).updateProject(
				req,
				res,
				payload.data,
				req.params.projectId,
			);

			return res.status(204).send();
		},
	],
	deleteProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:delete' }),
		async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
			const query = DeleteProjectDto.safeParse(req.query);
			if (query.error) {
				return res.status(400).json(query.error.errors[0]);
			}

			await Container.get(ProjectController).deleteProject(
				req,
				res,
				query.data,
				req.params.projectId,
			);

			return res.status(204).send();
		},
	],
	getProjects: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:list' }),
		validCursor,
		async (req: GetAll, res: Response) => {
			const { offset = 0, limit = 100 } = req.query;

			const [projects, count] = await Container.get(ProjectRepository).findAndCount({
				skip: offset,
				take: limit,
			});

			return res.json({
				data: projects,
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
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
			const payload = AddUsersToProjectDto.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}

			try {
				await Container.get(ProjectService).addUsersToProject(
					req.params.projectId,
					payload.data.relations,
				);
			} catch (error) {
				if (error instanceof ResponseError) {
					return res.status(error.httpStatusCode).send({ message: error.message });
				}
				throw error;
			}

			return res.status(201).send();
		},
	],
	changeUserRoleInProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req: AuthenticatedRequest<{ projectId: string; userId: string }>, res: Response) => {
			const payload = ChangeUserRoleInProject.safeParse(req.body);
			if (payload.error) {
				return res.status(400).json(payload.error.errors[0]);
			}

			const { projectId, userId } = req.params;
			const { role } = payload.data;
			try {
				await Container.get(ProjectService).changeUserRoleInProject(projectId, userId, role);
			} catch (error) {
				if (error instanceof ResponseError) {
					return res.status(error.httpStatusCode).send({ message: error.message });
				}
				throw error;
			}

			return res.status(204).send();
		},
	],
	deleteUserFromProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req: AuthenticatedRequest<{ projectId: string; userId: string }>, res: Response) => {
			const { projectId, userId } = req.params;
			try {
				await Container.get(ProjectService).deleteUserFromProject(projectId, userId);
			} catch (error) {
				if (error instanceof ResponseError) {
					return res.status(error.httpStatusCode).send({ message: error.message });
				}
				throw error;
			}
			return res.status(204).send();
		},
	],
};
