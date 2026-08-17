import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

import { createUpdateFolderTool } from '../tools/update-folder.tool';

describe('update-folder MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (overrides?: {
		updatedFolder?: { id: string; name: string; parentFolderId?: string | null };
		projectAccessible?: boolean;
	}) => {
		const updatedFolder = overrides?.updatedFolder ?? {
			id: 'folder-1',
			name: 'Renamed',
			parentFolderId: null,
		};
		const projectAccessible = overrides?.projectAccessible ?? true;

		const folderService = mockInstance(FolderService, {
			updateFolder: vi.fn().mockResolvedValue(updatedFolder),
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
		createUpdateFolderTool(user, mocks.folderService, mocks.projectService, mocks.telemetry);

	const callHandler = async (
		tool: ReturnType<typeof createUpdateFolderTool>,
		args: { projectId: string; folderId: string; name?: string; parentFolderId?: string },
	) =>
		await tool.handler(
			{
				projectId: args.projectId,
				folderId: args.folderId,
				name: args.name as string,
				parentFolderId: args.parentFolderId as string,
			},
			{} as never,
		);

	test('creates tool correctly', () => {
		const tool = createTool(createMocks());

		expect(tool.name).toBe('update_folder');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('renames a folder', async () => {
		const mocks = createMocks();
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			folderId: 'folder-1',
			name: 'Renamed',
		});

		expect(mocks.projectService.getProjectWithScope).toHaveBeenCalledWith(user, 'proj-1', [
			'folder:update',
		]);
		expect(mocks.folderService.updateFolder).toHaveBeenCalledWith('folder-1', 'proj-1', {
			name: 'Renamed',
			parentFolderId: undefined,
		});
		expect(result.isError).toBeUndefined();
		expect(result.structuredContent).toEqual({
			id: 'folder-1',
			name: 'Renamed',
			parentFolderId: null,
		});
	});

	test('moves a folder under another folder', async () => {
		const mocks = createMocks({
			updatedFolder: { id: 'folder-1', name: 'Campaigns', parentFolderId: 'folder-2' },
		});
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			folderId: 'folder-1',
			parentFolderId: 'folder-2',
		});

		expect(mocks.folderService.updateFolder).toHaveBeenCalledWith('folder-1', 'proj-1', {
			name: undefined,
			parentFolderId: 'folder-2',
		});
		expect(result.structuredContent).toEqual({
			id: 'folder-1',
			name: 'Campaigns',
			parentFolderId: 'folder-2',
		});
	});

	test('returns error when neither name nor parentFolderId is provided', async () => {
		const mocks = createMocks();
		const tool = createTool(mocks);

		const result = await callHandler(tool, { projectId: 'proj-1', folderId: 'folder-1' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: 'Provide at least one of name or parentFolderId',
		});
		expect(mocks.projectService.getProjectWithScope).not.toHaveBeenCalled();
		expect(mocks.folderService.updateFolder).not.toHaveBeenCalled();
	});

	test('returns error when user lacks access to project', async () => {
		const mocks = createMocks({ projectAccessible: false });
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-no-access',
			folderId: 'folder-1',
			name: 'Renamed',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ error: 'Project not found or access denied' });
		expect(mocks.folderService.updateFolder).not.toHaveBeenCalled();
	});

	test('surfaces validation errors from the folder service', async () => {
		const mocks = createMocks();
		mocks.folderService.updateFolder.mockRejectedValue(
			new Error(
				"Cannot set a folder's parent to a folder that is a descendant of the current folder",
			),
		);
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			folderId: 'folder-1',
			parentFolderId: 'descendant-folder',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: "Cannot set a folder's parent to a folder that is a descendant of the current folder",
		});
	});

	test('points unknown folder ids at search_folders', async () => {
		const mocks = createMocks();
		mocks.folderService.updateFolder.mockRejectedValue(new FolderNotFoundError('missing-folder'));
		const tool = createTool(mocks);

		const result = await callHandler(tool, {
			projectId: 'proj-1',
			folderId: 'missing-folder',
			name: 'Renamed',
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error:
				'Could not find the folder: missing-folder. Use search_folders to look up a valid folder id.',
		});
	});
});
