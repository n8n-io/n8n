import type { InstanceAiContext } from '../../../types';
import { createTagWorkflowTool, tagWorkflowInputSchema } from '../tag-workflow.tool';

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

describe('tag-workflow tool', () => {
	describe('schema validation', () => {
		it('accepts workflowId and tags array', () => {
			const result = tagWorkflowInputSchema.safeParse({
				workflowId: 'wf-1',
				tags: ['ai-built', 'gmail'],
			});
			expect(result.success).toBe(true);
		});

		it('rejects empty tags array', () => {
			const result = tagWorkflowInputSchema.safeParse({ workflowId: 'wf-1', tags: [] });
			expect(result.success).toBe(false);
		});

		it('rejects missing tags', () => {
			const result = tagWorkflowInputSchema.safeParse({ workflowId: 'wf-1' });
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('applies tags to workflow', async () => {
			const context = createMockContext({
				tagWorkflow: 'always_allow',
			} as InstanceAiContext['permissions']);
			(context.workspaceService!.tagWorkflow as jest.Mock).mockResolvedValue(['ai-built', 'gmail']);

			const tool = createTagWorkflowTool(context);
			const result = (await tool.execute!(
				{ workflowId: 'wf-1', tags: ['ai-built', 'gmail'] },
				{} as never,
			)) as Record<string, unknown>;

			expect(context.workspaceService!.tagWorkflow).toHaveBeenCalledWith('wf-1', [
				'ai-built',
				'gmail',
			]);
			expect(result).toEqual({ appliedTags: ['ai-built', 'gmail'] });
		});

		it('propagates errors when workflow not found', async () => {
			const context = createMockContext({
				tagWorkflow: 'always_allow',
			} as InstanceAiContext['permissions']);
			(context.workspaceService!.tagWorkflow as jest.Mock).mockRejectedValue(
				new Error('Workflow not found'),
			);

			const tool = createTagWorkflowTool(context);
			await expect(
				tool.execute!({ workflowId: 'bad', tags: ['test'] }, {} as never),
			).rejects.toThrow('Workflow not found');
		});
	});
});
