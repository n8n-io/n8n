import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { PROJECT_ROOT } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

import { createCreateFolderTool } from '../tools/create-folder.tool';

describe('create-folder MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (overrides?: {
		createdFolder?: { id: string; name: string; parentFolder?: { id: string } | null };
		projectAccessible?: boolean;
	}) => {
		const createdFolder = overrides?.createdFolder ?? {
			id: 'folder-1',
			name: 'Marketing',
			parentFolder: null,
		};
		const projectAccessible = overrides?.projectAccessible ?? true;

		const folderService = mockInstance(FolderService, {
			createFolder: vi.fn().mockResolvedValue(createdFolder),
		});

		const projectService = mockInstance(ProjectService, {
			getProjectWithScope: vi
				.fn()
				.mockResolvedValue(projectAccessible ? { id: 'proj-1', type: 'team' } : null),
		});

		const telemetry = mockInstance(Telemetry, { track: vi.fn() });

		return { folderService, projectService, telemetry };
	};

	const createTool = (mocks: ReturnType<typeof createMocks>) =>
		createCreateFolderTool(user, mocks.folderService, mocks.projectService, mocks.telemetry);

	const callHandler = async (
		tool: ReturnType<typeof createCreateFolderTool>,
		args: { projectId: string; name: string; parentFolderId?: string },
	) =>
		await tool.handler(
			{
				projectId: args.projectId,
				name: args.name,
				parentFolderId: args.parentFolderId as string,
			},
			{} as never,
		);

	test('creates tool correctly', () => {
		const tool = createTool(createMocks());

		expect(tool.name).toBe('create_folder');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('creates a folder at the project root', async () => {
		const mocks = createMocks();
		const tool = createTool(mocks);

		const result = await callHandler(tool, { projectId: 'proj-1', name: 'Marketing' });

		expect(mocks.projectService.getProjectWithScope).toHaveBeenCalledWith(user, 'proj-1', [
			'folder:create',
		]);
		expect(mocks.folderService.createFolder).toHaveBeenCalledWith(
			{ name: 'Marketing', parentFolderId: undefined },
			'proj-1',
		);
		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			id: 'folder-1',
			name: 'Marketing',
			parentFolderId: null,
		});
	});

	test('treats the "0" root sentinel as no parent', async () => {
		const mocks = createMocks();
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Marketing',
			parentFolderId: PROJECT_ROOT,
		});

		expect(mocks.folderService.createFolder).toHaveBeenCalledWith(
			{ name: 'Marketing', parentFolderId: undefined },
			'proj-1',
		);
		expect(result.isError).toBeUndefined();
	});

	test('creates a nested folder', async () => {
		const mocks = createMocks({
			createdFolder: { id: 'folder-2', name: 'Campaigns', parentFolder: { id: 'folder-1' } },
		});
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Campaigns',
			parentFolderId: 'folder-1',
		});

		expect(mocks.folderService.createFolder).toHaveBeenCalledWith(
			{ name: 'Campaigns', parentFolderId: 'folder-1' },
			'proj-1',
		);
		expect(result.structuredContent).toEqual({
			id: 'folder-2',
			name: 'Campaigns',
			parentFolderId: 'folder-1',
		});
	});

	test('returns error when user lacks access to project', async () => {
		const mocks = createMocks({ projectAccessible: false });
		const tool = createTool(mocks);

		const result = await callHandler(tool, { projectId: 'proj-no-access', name: 'Marketing' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ error: 'Project not found or access denied' });
		expect(mocks.folderService.createFolder).not.toHaveBeenCalled();
	});

	test('returns error when the folder service fails', async () => {
		const mocks = createMocks();
		mocks.folderService.createFolder.mockRejectedValue(new Error('DB error'));
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Campaigns',
			parentFolderId: 'missing-folder',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ error: 'DB error' });
	});

	test('points unknown parent folder ids at search_folders', async () => {
		const mocks = createMocks();
		mocks.folderService.createFolder.mockRejectedValue(new FolderNotFoundError('missing-folder'));
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			name: 'Campaigns',
			parentFolderId: 'missing-folder',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error:
				'Could not find the folder: missing-folder. Use search_folders to look up a valid folder id.',
		});
	});
});
