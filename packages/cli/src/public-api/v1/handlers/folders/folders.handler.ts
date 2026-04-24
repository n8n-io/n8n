import {
	CreateFolderDto,
	DeleteFolderDto,
	ListFolderQueryDto,
	UpdateFolderDto,
} from '@n8n/api-types';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';

import type { PublicAPIHandler } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';
import { assertProjectScope } from '../../shared/services/utils.service';

type FoldersEndpoint<TParams extends Record<string, string>> = readonly [
	ReturnType<typeof isLicensed>,
	ReturnType<typeof apiKeyHasScopeWithGlobalScopeFallback>,
	PublicAPIHandler<TParams>,
];

type FolderHandlers = {
	createFolder: FoldersEndpoint<{ projectId: string }>;
	getFolders: FoldersEndpoint<{ projectId: string }>;
	deleteFolder: FoldersEndpoint<{ projectId: string; folderId: string }>;
	getFolder: FoldersEndpoint<{ projectId: string; folderId: string }>;
	updateFolder: FoldersEndpoint<{ projectId: string; folderId: string }>;
};

const folderHandlers: FolderHandlers = {
	createFolder: [
		isLicensed('feat:folders'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'folder:create' }),
		async (req, res) => {
			const { projectId } = req.params;
			await assertProjectScope(req.user, projectId, ['folder:create']);

			const payload = CreateFolderDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			try {
				const folder = await Container.get(FolderService).createFolder(payload.data, projectId);
				return res.status(201).json(folder);
			} catch (e) {
				if (e instanceof FolderNotFoundError) throw new NotFoundError(e.message);
				throw e;
			}
		},
	],
	getFolders: [
		isLicensed('feat:folders'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'folder:list' }),
		async (req, res) => {
			const { projectId } = req.params;
			await assertProjectScope(req.user, projectId, ['folder:list']);

			const query = ListFolderQueryDto.safeParse(req.query);
			if (query.error) {
				throw new BadRequestError(query.error.errors[0].message);
			}

			const [data, count] = await Container.get(FolderService).getManyAndCount(
				projectId,
				query.data,
			);
			return res.json({ count, data });
		},
	],
	deleteFolder: [
		isLicensed('feat:folders'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'folder:delete' }),
		async (req, res) => {
			const { projectId, folderId } = req.params;
			await assertProjectScope(req.user, projectId, ['folder:delete']);

			const query = DeleteFolderDto.safeParse(req.query);
			if (query.error) {
				throw new BadRequestError(query.error.errors[0].message);
			}

			try {
				await Container.get(FolderService).deleteFolder(req.user, folderId, projectId, query.data);
				return res.status(204).send();
			} catch (e) {
				if (e instanceof FolderNotFoundError) throw new NotFoundError(e.message);
				if (e instanceof UserError) throw new BadRequestError(e.message);
				throw e;
			}
		},
	],
	getFolder: [
		isLicensed('feat:folders'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'folder:read' }),
		async (req, res) => {
			const { projectId } = req.params;
			await assertProjectScope(req.user, projectId, ['folder:read']);

			try {
				const { folder, totalSubFolders, totalWorkflows } = await Container.get(
					FolderService,
				).findFolderWithContentCounts(req.params.folderId, projectId);

				return res.json({ ...folder, totalSubFolders, totalWorkflows });
			} catch (e) {
				if (e instanceof FolderNotFoundError) throw new NotFoundError(e.message);
				throw e;
			}
		},
	],
	updateFolder: [
		isLicensed('feat:folders'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'folder:update' }),
		async (req, res) => {
			const { projectId } = req.params;
			await assertProjectScope(req.user, projectId, ['folder:update']);

			const payload = UpdateFolderDto.safeParse(req.body);
			if (payload.error) {
				throw new BadRequestError(payload.error.errors[0].message);
			}

			try {
				const folder = await Container.get(FolderService).updateFolder(
					req.params.folderId,
					projectId,
					payload.data,
				);
				return res.json(folder);
			} catch (e) {
				if (e instanceof FolderNotFoundError) throw new NotFoundError(e.message);
				if (e instanceof UserError) throw new BadRequestError(e.message);
				throw e;
			}
		},
	],
};

export = folderHandlers;
