import type { InstanceAiContext } from '../../../types';
import { createListFoldersTool } from '../list-folders.tool';

function createMockContext(): InstanceAiContext {
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
	};
}

describe('list-folders tool', () => {
	describe('schema validation', () => {
		it('accepts a valid projectId', () => {
			const tool = createListFoldersTool(createMockContext());
			const result = tool.inputSchema!.safeParse({ projectId: 'proj-123' });
			expect(result.success).toBe(true);
		});

		it('rejects missing projectId', () => {
			const tool = createListFoldersTool(createMockContext());
			const result = tool.inputSchema!.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('returns folders from the workspace service', async () => {
			const context = createMockContext();
			const mockFolders = [
				{ id: 'f1', name: 'Integrations', parentFolderId: null },
				{ id: 'f2', name: 'Tests', parentFolderId: 'f1' },
			];
			(context.workspaceService!.listFolders as jest.Mock).mockResolvedValue(mockFolders);

			const tool = createListFoldersTool(context);
			const result = await tool.execute!({ projectId: 'proj-123' }, {} as never);

			expect(context.workspaceService!.listFolders).toHaveBeenCalledWith('proj-123');
			expect(result).toEqual({ folders: mockFolders });
		});

		it('returns empty array when no folders exist', async () => {
			const context = createMockContext();
			(context.workspaceService!.listFolders as jest.Mock).mockResolvedValue([]);

			const tool = createListFoldersTool(context);
			const result = await tool.execute!({ projectId: 'proj-123' }, {} as never);

			expect(result).toEqual({ folders: [] });
		});
	});
});
