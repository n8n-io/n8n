import type { Response } from 'express';
import Container from 'typedi';

import { ProjectController } from '@/controllers/project.controller';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import type { PaginatedRequest } from '@/public-api/types';
import type { ProjectRequest } from '@/requests';

import { globalScope, isLicensed, validCursor } from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type Create = ProjectRequest.Create;
type Update = ProjectRequest.Update;
type Delete = ProjectRequest.Delete;
type GetAll = PaginatedRequest;

export = {
	createProject: [
		isLicensed('feat:projectRole:admin'),
		globalScope('project:create'),
		async (req: Create, res: Response) => {
			const project = await Container.get(ProjectController).createProject(req);

			return res.status(201).json(project);
		},
	],
	updateProject: [
		isLicensed('feat:projectRole:admin'),
		globalScope('project:update'),
		async (req: Update, res: Response) => {
			await Container.get(ProjectController).updateProject(req);

			return res.status(204).send();
		},
	],
	deleteProject: [
		isLicensed('feat:projectRole:admin'),
		globalScope('project:delete'),
		async (req: Delete, res: Response) => {
			await Container.get(ProjectController).deleteProject(req);

			return res.status(204).send();
		},
	],
	getProjects: [
		isLicensed('feat:projectRole:admin'),
		globalScope('project:list'),
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
};
