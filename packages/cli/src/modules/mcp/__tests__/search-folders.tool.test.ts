import { mockInstance } from '@n8n/backend-test-utils';
import { FolderRepository, User } from '@n8n/db';

import { createSearchFoldersTool } from '../tools/search-folders.tool';

import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

describe('search-folders MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (overrides?: {
		folders?: Array<{ id: string; name: string; parentFolderId: string | null }>;
		count?: number;
		projectAccessible?: boolean;
	}) => {
		const folders = overrides?.folders ?? [];
		const count = overrides?.count ?? folders.length;
		const projectAccessible = overrides?.projectAccessible ?? true;

		const folderRepository = mockInstance(FolderRepository, {
			getManyAndCount: jest.fn().mockResolvedValue([folders, count]),
		});

		const projectService = mockInstance(ProjectService, {
			getProjectWithScope: jest
				.fn()
				.mockResolvedValue(projectAccessible ? { id: 'proj-1', type: 'team' } : null),
		});

		const telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});

		return { folderRepository, projectService, telemetry };
	};

	const callHandler = async (
		tool: ReturnType<typeof createSearchFoldersTool>,
		args: { projectId: string; query?: string; limit?: number },
	) =>
		await tool.handler(
			{
				projectId: args.projectId,
				query: args.query as string,
				limit: args.limit as number,
			},
			{} as never,
		);

	test('creates tool correctly', () => {
		const { folderRepository, projectService, telemetry } = createMocks();

		const tool = createSearchFoldersTool(
			user,
			folderRepository as unknown as FolderRepository,
			projectService as unknown as ProjectService,
			telemetry,
		);

		expect(tool.name).toBe('search_folders');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('returns folders for a project', async () => {
		const folders = [
			{ id: 'folder-1', name: 'Production', parentFolderId: null },
			{ id: 'folder-2', name: 'Dev', parentFolderId: 'folder-1' },
		];
		const { folderRepository, projectService, telemetry } = createMocks({ folders });

		const tool = createSearchFoldersTool(
			user,
			folderRepository as unknown as FolderRepository,
			projectService as unknown as ProjectService,
			telemetry,
		);

		const result = await callHandler(tool, { projectId: 'proj-1' });

		expect(result.structuredContent).toEqual({
			data: [
				{ id: 'folder-1', name: 'Production', parentFolderId: null },
				{ id: 'folder-2', name: 'Dev', parentFolderId: 'folder-1' },
			],
			count: 2,
		});

		expect(projectService.getProjectWithScope).toHaveBeenCalledWith(user, 'proj-1', [
			'folder:list',
		]);

		expect(folderRepository.getManyAndCount).toHaveBeenCalledWith({
			filter: { projectId: 'proj-1' },
			take: 100,
		});
	});

	test('filters by query', async () => {
		const { folderRepository, projectService, telemetry } = createMocks();

		const tool = createSearchFoldersTool(
			user,
			folderRepository as unknown as FolderRepository,
			projectService as unknown as ProjectService,
			telemetry,
		);

		await callHandler(tool, { projectId: 'proj-1', query: 'prod' });

		expect(folderRepository.getManyAndCount).toHaveBeenCalledWith({
			filter: { projectId: 'proj-1', name: 'prod' },
			take: 100,
		});
	});

	test('returns error when user lacks access to project', async () => {
		const { folderRepository, projectService, telemetry } = createMocks({
			projectAccessible: false,
		});

		const tool = createSearchFoldersTool(
			user,
			folderRepository as unknown as FolderRepository,
			projectService as unknown as ProjectService,
			telemetry,
		);

		const result = await callHandler(tool, { projectId: 'proj-no-access' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'Project not found or access denied',
		});
		expect(folderRepository.getManyAndCount).not.toHaveBeenCalled();
	});

	test('handles errors', async () => {
		const folderRepository = mockInstance(FolderRepository, {
			getManyAndCount: jest.fn().mockRejectedValue(new Error('DB error')),
		});
		const projectService = mockInstance(ProjectService, {
			getProjectWithScope: jest.fn().mockResolvedValue({ id: 'proj-1', type: 'team' }),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });

		const tool = createSearchFoldersTool(
			user,
			folderRepository as unknown as FolderRepository,
			projectService as unknown as ProjectService,
			telemetry,
		);

		const result = await callHandler(tool, { projectId: 'proj-1' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'DB error',
		});
	});
});
