import type { InstanceAiContext } from '../../../types';
import {
	createMoveWorkflowToFolderTool,
	moveWorkflowToFolderInputSchema,
} from '../move-workflow-to-folder.tool';

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

describe('move-workflow-to-folder tool', () => {
	describe('schema validation', () => {
		it('accepts workflowId and folderId', () => {
			const result = moveWorkflowToFolderInputSchema.safeParse({
				workflowId: 'wf-1',
				folderId: 'f-1',
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing folderId', () => {
			const result = moveWorkflowToFolderInputSchema.safeParse({ workflowId: 'wf-1' });
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('moves workflow to folder', async () => {
			const context = createMockContext({
				moveWorkflowToFolder: 'always_allow',
			} as InstanceAiContext['permissions']);
			(context.workspaceService!.moveWorkflowToFolder as jest.Mock).mockResolvedValue(undefined);

			const tool = createMoveWorkflowToFolderTool(context);
			const result = (await tool.execute!(
				{ workflowId: 'wf-1', folderId: 'f-1' },
				{} as never,
			)) as Record<string, unknown>;

			expect(context.workspaceService!.moveWorkflowToFolder).toHaveBeenCalledWith('wf-1', 'f-1');
			expect(result).toEqual({ success: true });
		});

		it('propagates errors when workflow not found', async () => {
			const context = createMockContext({
				moveWorkflowToFolder: 'always_allow',
			} as InstanceAiContext['permissions']);
			(context.workspaceService!.moveWorkflowToFolder as jest.Mock).mockRejectedValue(
				new Error('Workflow wf-bad not found or not accessible'),
			);

			const tool = createMoveWorkflowToFolderTool(context);
			await expect(
				tool.execute!({ workflowId: 'wf-bad', folderId: 'f-1' }, {} as never),
			).rejects.toThrow('Workflow wf-bad not found or not accessible');
		});
	});
});
