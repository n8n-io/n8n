import { CreateProjectDto, DeleteProjectDto, UpdateProjectDto } from '@n8n/api-types';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { ProjectController } from '@/controllers/project.controller';
import type { PaginatedRequest } from '@/public-api/types';
import type { AuthenticatedRequest } from '@/requests';

import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type Create = ProjectRequest.Create;
type Update = ProjectRequest.Update;
type Delete = ProjectRequest.Delete;
type DeleteUser = ProjectRequest.DeleteUser;
type GetAll = PaginatedRequest;
type AddUsers = ProjectRequest.AddUsers;

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
			const payload = UpdateProjectDto.safeParse(req.body);
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
	deleteUserFromProject: [
		isLicensed('feat:projectRole:admin'),
		globalScope('project:update'),
		async (req: DeleteUser, res: Response) => {
			const { projectId, id: userId } = req.params;

			const project = await Container.get(ProjectRepository).findOne({
				where: { id: projectId },
				relations: { projectRelations: true },
			});

			if (!project) {
				return res.status(404).send({ message: 'Not found' });
			}

			const relations = project.projectRelations.filter((relation) => relation.userId !== userId);

			await Container.get(ProjectController).syncProjectRelations(projectId, relations);

			return res.status(204).send();
		},
	],
	addUsersToProject: [
		isLicensed('feat:projectRole:admin'),
		globalScope('project:update'),
		async (req: AddUsers, res: Response) => {
			const { projectId } = req.params;
			const { users } = req.body;

			const project = await Container.get(ProjectRepository).findOne({
				where: { id: projectId },
				relations: { projectRelations: true },
			});

			if (!project) {
				return res.status(404).send({ message: 'Not found' });
			}

			const existingUsers = project.projectRelations.map((relation) => ({
				userId: relation.userId,
				role: relation.role,
			}));

			// TODO:
			// - What happens when the user is already in the project?
			// - What happens when the user is not found on the instance?

			try {
				await Container.get(ProjectController).syncProjectRelations(projectId, [
					...existingUsers,
					...users,
				]);
			} catch (error) {
				return res
					.status(400)
					.send({ message: error instanceof Error ? error.message : 'Bad request' });
			}

			return res.status(201).send();
		},
	],
};
