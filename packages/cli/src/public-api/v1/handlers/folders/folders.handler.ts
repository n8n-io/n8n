import { CreateFolderDto, ListFolderQueryDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';

import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';
import { assertProjectScope } from '../../shared/services/utils.service';

export = {
	createFolder: [
		isLicensed('feat:folders'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'folder:create' }),
		async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
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
		async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
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
};
