import type { InstanceAiContext } from '../../../types';
import { createListTagsTool } from '../list-tags.tool';

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

describe('list-tags tool', () => {
	describe('schema validation', () => {
		it('accepts empty input', () => {
			const tool = createListTagsTool(createMockContext());
			const result = tool.inputSchema!.safeParse({});
			expect(result.success).toBe(true);
		});
	});

	describe('execute', () => {
		it('returns tags from the workspace service', async () => {
			const context = createMockContext();
			const mockTags = [
				{ id: 't1', name: 'production' },
				{ id: 't2', name: 'ai-built' },
			];
			(context.workspaceService!.listTags as jest.Mock).mockResolvedValue(mockTags);

			const tool = createListTagsTool(context);
			const result = await tool.execute!({}, {} as never);

			expect(context.workspaceService!.listTags).toHaveBeenCalled();
			expect(result).toEqual({ tags: mockTags });
		});

		it('returns empty array when no tags exist', async () => {
			const context = createMockContext();
			(context.workspaceService!.listTags as jest.Mock).mockResolvedValue([]);

			const tool = createListTagsTool(context);
			const result = await tool.execute!({}, {} as never);

			expect(result).toEqual({ tags: [] });
		});
	});
});
