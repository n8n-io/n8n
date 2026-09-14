import type { UpdateFolderPublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest, Folder } from '@n8n/db';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { resolvePublicApiRoutes } from '@/public-api/public-api-route-resolver';
import type { FolderService } from '@/services/folder.service';

import { FoldersPublicController } from '../folders.public.controller';

vi.mock('@/public-api/v1/shared/services/utils.service', () => ({
	assertProjectScope: vi.fn(),
}));

describe('FoldersPublicController', () => {
	const folderService = mock<FolderService>();
	let controller: FoldersPublicController;

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new FoldersPublicController(folderService);
	});

	const updateFolder = async () =>
		await controller.updateFolder(
			mock<AuthenticatedRequest>(),
			mock<Response>(),
			'project-id',
			'folder-id',
			mock<UpdateFolderPublicDto>(),
		);

	// The migration must not move the route, its verb, its success status or its API-key scope.
	describe('route contract', () => {
		const route = resolvePublicApiRoutes().find(
			(candidate) => candidate.handlerName === 'updateFolder',
		);

		it('keeps the path, method, success status and API-key scope of the eov handler', () => {
			expect(route).toMatchObject({
				path: '/projects/:projectId/folders/:folderId',
				method: 'patch',
				successStatus: 200,
				apiKeyScope: 'folder:update',
			});
		});
	});

	describe('updateFolder', () => {
		it('returns only the public fields of the updated folder', async () => {
			folderService.updateFolder.mockResolvedValue(
				mock<Folder>({
					id: 'folder-id',
					name: 'Renamed',
					parentFolderId: null,
					createdAt: new Date('2025-01-01T00:00:00.000Z'),
					updatedAt: new Date('2025-01-02T00:00:00.000Z'),
				}),
			);

			await expect(updateFolder()).resolves.toEqual({
				id: 'folder-id',
				name: 'Renamed',
				parentFolderId: null,
				createdAt: '2025-01-01T00:00:00.000Z',
				updatedAt: '2025-01-02T00:00:00.000Z',
			});
		});

		it('answers 404 when the folder is not found', async () => {
			folderService.updateFolder.mockRejectedValue(new FolderNotFoundError('folder-id'));

			await expect(updateFolder()).rejects.toThrow(NotFoundError);
		});

		it('answers 400 for a user error', async () => {
			folderService.updateFolder.mockRejectedValue(
				new UserError('Cannot set a folder as its own parent'),
			);

			await expect(updateFolder()).rejects.toThrow(BadRequestError);
		});

		it('rethrows anything else', async () => {
			folderService.updateFolder.mockRejectedValue(new Error('the database went away'));

			await expect(updateFolder()).rejects.toThrow('the database went away');
		});
	});
});
