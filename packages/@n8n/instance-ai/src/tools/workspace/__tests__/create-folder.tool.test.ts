import type { InstanceAiContext } from '../../../types';
import { createCreateFolderTool } from '../create-folder.tool';

function createMockContext(
	permissionOverrides?: InstanceAiContext['permissions'],
): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		workspaceService: {
			listProjects: jest.fn(),
			listFolders: jest.fn(),
			createFolder: jest.fn(),
			deleteFolder: jest.fn(),
			moveWorkflowToFolder: jest.fn(),
			tagWorkflow: jest.fn(),
			listTags: jest.fn(),
			createTag: jest.fn(),
			cleanupTestExecutions: jest.fn(),
		},
		permissions: permissionOverrides,
	};
}

describe('create-folder tool', () => {
	describe('schema validation', () => {
		it('accepts name and projectId', () => {
			const tool = createCreateFolderTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ name: 'My Folder', projectId: 'proj-1' });
			expect(result.success).toBe(true);
		});

		it('accepts optional parentFolderId', () => {
			const tool = createCreateFolderTool(createMockContext());
			const result = tool.inputSchema!.safeParse({
				name: 'Sub Folder',
				projectId: 'proj-1',
				parentFolderId: 'f-parent',
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing name', () => {
			const tool = createCreateFolderTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ projectId: 'proj-1' });
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('creates a root-level folder', async () => {
			const context = createMockContext({
				createFolder: 'always_allow',
			} as InstanceAiContext['permissions']);
			const created = { id: 'f-new', name: 'Automations', parentFolderId: null };
			(context.workspaceService!.createFolder as jest.Mock).mockResolvedValue(created);

			const tool = createCreateFolderTool(context);
			const result = await tool.execute!({ name: 'Automations', projectId: 'proj-1' }, {} as never);

			expect(context.workspaceService!.createFolder).toHaveBeenCalledWith(
				'Automations',
				'proj-1',
				undefined,
			);
			expect(result).toEqual(created);
		});

		it('creates a nested folder', async () => {
			const context = createMockContext({
				createFolder: 'always_allow',
			} as InstanceAiContext['permissions']);
			const created = { id: 'f-sub', name: 'Sub', parentFolderId: 'f-parent' };
			(context.workspaceService!.createFolder as jest.Mock).mockResolvedValue(created);

			const tool = createCreateFolderTool(context);
			const result = await tool.execute!(
				{ name: 'Sub', projectId: 'proj-1', parentFolderId: 'f-parent' },
				{} as never,
			);

			expect(context.workspaceService!.createFolder).toHaveBeenCalledWith(
				'Sub',
				'proj-1',
				'f-parent',
			);
			expect(result).toEqual(created);
		});

		it('propagates service errors', async () => {
			const context = createMockContext({
				createFolder: 'always_allow',
			} as InstanceAiContext['permissions']);
			(context.workspaceService!.createFolder as jest.Mock).mockRejectedValue(
				new Error('Parent folder not found'),
			);

			const tool = createCreateFolderTool(context);
			await expect(
				tool.execute!({ name: 'X', projectId: 'proj-1', parentFolderId: 'bad' }, {} as never),
			).rejects.toThrow('Parent folder not found');
		});
	});
});
