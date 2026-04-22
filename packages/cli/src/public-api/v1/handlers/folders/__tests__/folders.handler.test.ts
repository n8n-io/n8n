import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import type { AuthenticatedRequest, Folder } from '@n8n/db';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import * as middlewares from '@/public-api/v1/shared/middlewares/global.middleware';
import { mockProject } from '@test/mock-objects';

const mockMiddleware = jest.fn(async (_req: unknown, _res: unknown, next: unknown) =>
	(next as () => void)(),
) as unknown as middlewares.ScopeTaggedMiddleware;
jest.spyOn(middlewares, 'isLicensed').mockReturnValue(mockMiddleware as any);
jest.spyOn(middlewares, 'apiKeyHasScopeWithGlobalScopeFallback').mockReturnValue(mockMiddleware);

const handler = require('../folders.handler');

describe('Folders Handler', () => {
	let mockFolderService: jest.Mocked<FolderService>;
	let mockProjectRepository: jest.Mocked<ProjectRepository>;
	let mockProjectService: jest.Mocked<ProjectService>;
	let mockResponse: Partial<Response>;

	const projectId = 'test-project-id';
	const project = Object.assign(mockProject(), { id: projectId });
	const userId = 'test-user-id';

	const makeUser = (role = 'global:member') =>
		({ id: userId, role: { slug: role } }) as unknown as AuthenticatedRequest['user'];

	beforeEach(() => {
		mockFolderService = mockInstance(FolderService);
		mockProjectRepository = mockInstance(ProjectRepository);
		mockProjectService = mockInstance(ProjectService);

		jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
			if (serviceClass === FolderService) return mockFolderService;
			if (serviceClass === ProjectRepository) return mockProjectRepository;
			if (serviceClass === ProjectService) return mockProjectService;
			return {};
		});

		mockProjectRepository.findOneBy.mockResolvedValue(project);
		mockProjectService.getProjectWithScope.mockResolvedValue(project);

		mockResponse = {
			json: jest.fn().mockReturnThis(),
			status: jest.fn().mockReturnThis(),
		};

		jest.clearAllMocks();
	});

	const getHandlerFn = (operationId: string) => {
		const chain = handler[operationId];
		return chain[chain.length - 1];
	};

	describe('createFolder', () => {
		const callCreateFolder = async (req: unknown) =>
			getHandlerFn('createFolder')(req, mockResponse);

		it('should create a folder and return 201', async () => {
			const createdFolder = { id: 'folder-1', name: 'New Folder', parentFolderId: null };
			mockFolderService.createFolder.mockResolvedValue(createdFolder as never);

			await callCreateFolder({
				user: makeUser(),
				params: { projectId },
				body: { name: 'New Folder' },
			});

			expect(mockFolderService.createFolder).toHaveBeenCalledWith(
				{ name: 'New Folder' },
				projectId,
			);
			expect(mockResponse.status).toHaveBeenCalledWith(201);
			expect(mockResponse.json).toHaveBeenCalledWith(createdFolder);
		});

		it('should create a folder with parentFolderId', async () => {
			const createdFolder = {
				id: 'folder-2',
				name: 'Child Folder',
				parentFolderId: 'parent-id',
			};
			mockFolderService.createFolder.mockResolvedValue(createdFolder as Folder);

			await callCreateFolder({
				user: makeUser(),
				params: { projectId },
				body: { name: 'Child Folder', parentFolderId: 'parent-id' },
			});

			expect(mockFolderService.createFolder).toHaveBeenCalledWith(
				{ name: 'Child Folder', parentFolderId: 'parent-id' },
				projectId,
			);
			expect(mockResponse.status).toHaveBeenCalledWith(201);
		});

		it('should throw BadRequestError when name is missing', async () => {
			await expect(
				callCreateFolder({
					user: makeUser(),
					params: { projectId },
					body: {},
				}),
			).rejects.toThrow(BadRequestError);

			expect(mockFolderService.createFolder).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when project does not exist', async () => {
			mockProjectRepository.findOneBy.mockResolvedValue(null);

			await expect(
				callCreateFolder({
					user: makeUser(),
					params: { projectId: 'non-existent' },
					body: { name: 'Folder' },
				}),
			).rejects.toThrow(NotFoundError);

			expect(mockFolderService.createFolder).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when user lacks project scope', async () => {
			mockProjectService.getProjectWithScope.mockResolvedValue(null);

			await expect(
				callCreateFolder({
					user: makeUser(),
					params: { projectId },
					body: { name: 'Folder' },
				}),
			).rejects.toThrow(ForbiddenError);

			expect(mockFolderService.createFolder).not.toHaveBeenCalled();
		});

		it('should throw NotFoundError when parentFolderId is invalid', async () => {
			mockFolderService.createFolder.mockRejectedValue(new FolderNotFoundError('parent-id'));

			await expect(
				callCreateFolder({
					user: makeUser(),
					params: { projectId },
					body: { name: 'Child', parentFolderId: 'parent-id' },
				}),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('getFolders', () => {
		const callGetFolders = async (req: unknown) => getHandlerFn('getFolders')(req, mockResponse);

		it('should return folders with count', async () => {
			const folders = [
				{ id: 'f1', name: 'Folder 1' },
				{ id: 'f2', name: 'Folder 2' },
			] as Folder[];
			mockFolderService.getManyAndCount.mockResolvedValue([folders, 2]);

			await callGetFolders({
				user: makeUser(),
				params: { projectId },
				query: {},
			});

			expect(mockFolderService.getManyAndCount).toHaveBeenCalledWith(projectId, {
				skip: 0,
				take: 10,
			});
			expect(mockResponse.json).toHaveBeenCalledWith({ count: 2, data: folders });
		});

		it('should return empty list when no folders exist', async () => {
			mockFolderService.getManyAndCount.mockResolvedValue([[], 0]);

			await callGetFolders({
				user: makeUser(),
				params: { projectId },
				query: {},
			});

			expect(mockResponse.json).toHaveBeenCalledWith({ count: 0, data: [] });
		});

		it('should pass filter, sortBy, skip, and take to service', async () => {
			mockFolderService.getManyAndCount.mockResolvedValue([[], 0]);

			await callGetFolders({
				user: makeUser(),
				params: { projectId },
				query: {
					filter: '{"name":"Test"}',
					sortBy: 'name:asc',
					skip: '10',
					take: '5',
				},
			});

			expect(mockFolderService.getManyAndCount).toHaveBeenCalledWith(
				projectId,
				expect.objectContaining({
					filter: expect.objectContaining({ name: 'Test' }),
					sortBy: 'name:asc',
					skip: 10,
					take: 5,
				}),
			);
		});

		it('should throw NotFoundError when project does not exist', async () => {
			mockProjectRepository.findOneBy.mockResolvedValue(null);

			await expect(
				callGetFolders({
					user: makeUser(),
					params: { projectId: 'non-existent' },
					query: {},
				}),
			).rejects.toThrow(NotFoundError);

			expect(mockFolderService.getManyAndCount).not.toHaveBeenCalled();
		});

		it('should throw ForbiddenError when user lacks project scope', async () => {
			mockProjectService.getProjectWithScope.mockResolvedValue(null);

			await expect(
				callGetFolders({
					user: makeUser(),
					params: { projectId },
					query: {},
				}),
			).rejects.toThrow(ForbiddenError);

			expect(mockFolderService.getManyAndCount).not.toHaveBeenCalled();
		});
	});
});
