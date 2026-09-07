import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

import { createSearchFoldersTool } from '../tools/search-folders.tool';

describe('search-folders MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (overrides?: {
		folders?: Array<{
			id: string;
			name: string;
			parentFolder?: { id: string } | null;
			path?: string[];
		}>;
		count?: number;
		projectAccessible?: boolean;
	}) => {
		const folders = overrides?.folders ?? [];
		const count = overrides?.count ?? folders.length;
		const projectAccessible = overrides?.projectAccessible ?? true;

		const folderService = mockInstance(FolderService, {
			getManyAndCount: vi.fn().mockResolvedValue([folders, count]),
		});

		const projectService = mockInstance(ProjectService, {
			getProjectWithScope: vi
				.fn()
				.mockResolvedValue(projectAccessible ? { id: 'proj-1', type: 'team' } : null),
		});

		const telemetry = mockInstance(Telemetry, {
			track: vi.fn(),
		});

		return { folderService, projectService, telemetry };
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
		const { folderService, projectService, telemetry } = createMocks();

		const tool = createSearchFoldersTool(user, folderService, projectService, telemetry);

		expect(tool.name).toBe('search_folders');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('returns folders for a project', async () => {
		const folders = [
			{ id: 'folder-1', name: 'Production', parentFolder: null, path: ['Production'] },
			{
				id: 'folder-2',
				name: 'Dev',
				parentFolder: { id: 'folder-1' },
				path: ['Production', 'Dev'],
			},
		];
		const { folderService, projectService, telemetry } = createMocks({ folders });

		const tool = createSearchFoldersTool(user, folderService, projectService, telemetry);

		const result = await callHandler(tool, { projectId: 'proj-1' });

		expect(result.structuredContent).toEqual({
			data: [
				{ id: 'folder-1', name: 'Production', parentFolderId: null, path: ['Production'] },
				{ id: 'folder-2', name: 'Dev', parentFolderId: 'folder-1', path: ['Production', 'Dev'] },
			],
			count: 2,
		});

		expect(projectService.getProjectWithScope).toHaveBeenCalledWith(user, 'proj-1', [
			'folder:list',
		]);

		expect(folderService.getManyAndCount).toHaveBeenCalledWith('proj-1', {
			filter: {},
			select: { name: true, parentFolder: true, path: true, updatedAt: true },
			take: 100,
		});
	});

	test('filters by query', async () => {
		const { folderService, projectService, telemetry } = createMocks();

		const tool = createSearchFoldersTool(user, folderService, projectService, telemetry);

		await callHandler(tool, { projectId: 'proj-1', query: 'prod' });

		expect(folderService.getManyAndCount).toHaveBeenCalledWith('proj-1', {
			filter: { name: 'prod' },
			select: { name: true, parentFolder: true, path: true, updatedAt: true },
			take: 100,
		});
	});

	test('returns error when user lacks access to project', async () => {
		const { folderService, projectService, telemetry } = createMocks({
			projectAccessible: false,
		});

		const tool = createSearchFoldersTool(user, folderService, projectService, telemetry);

		const result = await callHandler(tool, { projectId: 'proj-no-access' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'Project not found or access denied',
		});
		expect(folderService.getManyAndCount).not.toHaveBeenCalled();
	});

	test('handles errors', async () => {
		const folderService = mockInstance(FolderService, {
			getManyAndCount: vi.fn().mockRejectedValue(new Error('DB error')),
		});
		const projectService = mockInstance(ProjectService, {
			getProjectWithScope: vi.fn().mockResolvedValue({ id: 'proj-1', type: 'team' }),
		});
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });

		const tool = createSearchFoldersTool(user, folderService, projectService, telemetry);

		const result = await callHandler(tool, { projectId: 'proj-1' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'DB error',
		});
	});
});
