import { Container } from '@n8n/di';
import type express from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';

import type { FolderRequest } from '../../../types';
import {
	apiKeyHasScope,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

export = {
	getFolders: [
		isLicensed('feat:folders'),
		apiKeyHasScope('folder:list'),
		validCursor,
		async (req: FolderRequest.List, res: express.Response): Promise<express.Response> => {
			const { offset = 0, limit = 100, projectId } = req.query;

			if (!projectId) {
				return res.status(400).json({ message: 'projectId is required' });
			}

			const project = await Container.get(ProjectService).getProjectWithScope(req.user, projectId, [
				'folder:list',
			]);

			if (!project) {
				throw new NotFoundError(`Could not find project with ID "${projectId}"`);
			}

			const [folders, count] = await Container.get(FolderService).getManyAndCount(projectId, {
				select: {
					name: true,
					createdAt: true,
					updatedAt: true,
					parentFolderId: true,
					workflowIds: true,
				},
				skip: offset,
				take: limit,
			});

			const data = folders.map(({ workflows, ...folder }) => ({
				...folder,
				items: workflows,
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
};
