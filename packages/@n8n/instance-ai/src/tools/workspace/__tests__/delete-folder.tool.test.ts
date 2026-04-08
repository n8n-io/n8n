import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createDeleteFolderTool, deleteFolderInputSchema } from '../delete-folder.tool';

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

function createToolCtx(options?: { resumeData?: { approved: boolean } }) {
	return {
		agent: {
			suspend: jest.fn(),
			resumeData: options?.resumeData ?? undefined,
		},
	} as never;
}

describe('delete-folder tool', () => {
	describe('schema validation', () => {
		it('accepts folderId and projectId', () => {
			const result = deleteFolderInputSchema.safeParse({ folderId: 'f-1', projectId: 'proj-1' });
			expect(result.success).toBe(true);
		});

		it('accepts optional transferToFolderId', () => {
			const result = deleteFolderInputSchema.safeParse({
				folderId: 'f-1',
				projectId: 'proj-1',
				transferToFolderId: 'f-2',
			});
			expect(result.success).toBe(true);
		});
	});

	describe('suspend/resume flow (default permissions)', () => {
		it('suspends for confirmation on first call', async () => {
			const context = createMockContext();
			const tool = createDeleteFolderTool(context);
			const ctx = createToolCtx();

			await tool.execute!({ folderId: 'f-1', projectId: 'proj-1' }, ctx);

			const suspend = (ctx as unknown as { agent: { suspend: jest.Mock } }).agent.suspend;
			expect(suspend).toHaveBeenCalledTimes(1);

			const payload = (suspend.mock.calls as unknown[][])[0][0] as {
				requestId: string;
				message: string;
				severity: string;
			};
			expect(payload.requestId).toEqual(expect.any(String));
			expect(payload.message).toContain('f-1');
			expect(payload.severity).toBe('destructive');
			expect(context.workspaceService!.deleteFolder).not.toHaveBeenCalled();
		});

		it('deletes the folder when resumed with approved: true', async () => {
			const context = createMockContext();
			(context.workspaceService!.deleteFolder as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteFolderTool(context);
			const ctx = createToolCtx({ resumeData: { approved: true } });

			const result = (await tool.execute!({ folderId: 'f-1', projectId: 'proj-1' }, ctx)) as Record<
				string,
				unknown
			>;

			expect(context.workspaceService!.deleteFolder).toHaveBeenCalledWith(
				'f-1',
				'proj-1',
				undefined,
			);
			expect(result).toEqual({ success: true });
		});

		it('passes transferToFolderId when provided', async () => {
			const context = createMockContext();
			(context.workspaceService!.deleteFolder as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteFolderTool(context);
			const ctx = createToolCtx({ resumeData: { approved: true } });

			await tool.execute!({ folderId: 'f-1', projectId: 'proj-1', transferToFolderId: 'f-2' }, ctx);

			expect(context.workspaceService!.deleteFolder).toHaveBeenCalledWith('f-1', 'proj-1', 'f-2');
		});

		it('returns denied when resumed with approved: false', async () => {
			const context = createMockContext();
			const tool = createDeleteFolderTool(context);
			const ctx = createToolCtx({ resumeData: { approved: false } });

			const result = (await tool.execute!({ folderId: 'f-1', projectId: 'proj-1' }, ctx)) as Record<
				string,
				unknown
			>;

			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
			expect(context.workspaceService!.deleteFolder).not.toHaveBeenCalled();
		});
	});

	describe('always_allow permission', () => {
		it('skips confirmation and deletes immediately', async () => {
			const context = createMockContext({
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				deleteFolder: 'always_allow',
			});
			(context.workspaceService!.deleteFolder as jest.Mock).mockResolvedValue(undefined);
			const tool = createDeleteFolderTool(context);
			const ctx = createToolCtx();

			const result = (await tool.execute!({ folderId: 'f-1', projectId: 'proj-1' }, ctx)) as Record<
				string,
				unknown
			>;

			const suspend = (ctx as unknown as { agent: { suspend: jest.Mock } }).agent.suspend;
			expect(suspend).not.toHaveBeenCalled();
			expect(context.workspaceService!.deleteFolder).toHaveBeenCalledWith(
				'f-1',
				'proj-1',
				undefined,
			);
			expect(result).toEqual({ success: true });
		});
	});

	describe('error handling', () => {
		it('propagates service errors', async () => {
			const context = createMockContext({
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				deleteFolder: 'always_allow',
			});
			(context.workspaceService!.deleteFolder as jest.Mock).mockRejectedValue(
				new Error('Folder not found'),
			);
			const tool = createDeleteFolderTool(context);
			const ctx = createToolCtx();

			await expect(tool.execute!({ folderId: 'bad-id', projectId: 'proj-1' }, ctx)).rejects.toThrow(
				'Folder not found',
			);
		});
	});
});
