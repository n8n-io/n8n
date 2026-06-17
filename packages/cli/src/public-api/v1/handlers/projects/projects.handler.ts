import {
	AddUsersToProjectDto,
	ChangeUserRoleInProject,
	CreateProjectDto,
	DeleteProjectDto,
	UpdateProjectWithRelationsDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import pick from 'lodash/pick';

import { ProjectController } from '@/controllers/project.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { PaginatedRequest } from '@/public-api/types';
import { ProjectService } from '@/services/project.service.ee';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type GetAll = PaginatedRequest;
type GetProjectUsersRequest = AuthenticatedRequest<{ projectId: string }> & GetAll;

type ProjectHandlers = {
	createProject: PublicAPIEndpoint<AuthenticatedRequest>;
	updateProject: PublicAPIEndpoint<AuthenticatedRequest<{ projectId: string }>>;
	deleteProject: PublicAPIEndpoint<AuthenticatedRequest<{ projectId: string }>>;
	getProjects: PublicAPIEndpoint<GetAll>;
	getProjectUsers: PublicAPIEndpoint<GetProjectUsersRequest>;
	addUsersToProject: PublicAPIEndpoint<AuthenticatedRequest<{ projectId: string }>>;
	changeUserRoleInProject: PublicAPIEndpoint<
		AuthenticatedRequest<{ projectId: string; userId: string }>
	>;
	deleteUserFromProject: PublicAPIEndpoint<
		AuthenticatedRequest<{ projectId: string; userId: string }>
	>;
};

const projectHandlers: ProjectHandlers = {
	createProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:create' }),
		async (req, res) => {
			const payload = CreateProjectDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			const project = await Container.get(ProjectController).createProject(req, res, payload.data);

			return res.status(201).json(project);
		},
	],
	updateProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req, res) => {
			const payload = UpdateProjectWithRelationsDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
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
		async (req, res) => {
			const query = DeleteProjectDto.safeParse(req.query);
			if (query.error) {
				throw new BadRequestError(query.error.errors[0].message);
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
		async (req, res) => {
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

			const projectRelationRepository = Container.get(ProjectRelationRepository);
			const [relations, count] = await projectRelationRepository.findAndCount({
				where: { projectId },
				relations: { user: true, role: true },
				skip: offset,
				take: limit,
			});

			const memberFields = [
				'id',
				'email',
				'firstName',
				'lastName',
				'createdAt',
				'updatedAt',
			] as const;
			const data = relations.map((relation) => ({
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
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req, res) => {
			const payload = AddUsersToProjectDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			await Container.get(ProjectService).addUsersToProject(
				req.params.projectId,
				payload.data.relations,
			);

			return res.status(201).send();
		},
	],
	changeUserRoleInProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req, res) => {
			const payload = ChangeUserRoleInProject.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			const { projectId, userId } = req.params;
			const { role } = payload.data;
			await Container.get(ProjectService).changeUserRoleInProject(projectId, userId, role);

			return res.status(204).send();
		},
	],
	deleteUserFromProject: [
		isLicensed('feat:projectRole:admin'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'project:update' }),
		async (req, res) => {
			const { projectId, userId } = req.params;

			await Container.get(ProjectService).deleteUserFromProject(projectId, userId);

			return res.status(204).send();
		},
	],
};

export = projectHandlers;
