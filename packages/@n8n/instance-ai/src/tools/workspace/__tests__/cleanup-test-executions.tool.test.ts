import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import {
	createCleanupTestExecutionsTool,
	cleanupTestExecutionsInputSchema,
} from '../cleanup-test-executions.tool';

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

describe('cleanup-test-executions tool', () => {
	describe('schema validation', () => {
		it('accepts workflowId', () => {
			const result = cleanupTestExecutionsInputSchema.safeParse({ workflowId: 'wf-1' });
			expect(result.success).toBe(true);
		});

		it('accepts optional olderThanHours', () => {
			const result = cleanupTestExecutionsInputSchema.safeParse({
				workflowId: 'wf-1',
				olderThanHours: 24,
			});
			expect(result.success).toBe(true);
		});
	});

	describe('suspend/resume flow (default permissions)', () => {
		it('suspends for confirmation on first call', async () => {
			const context = createMockContext();
			const tool = createCleanupTestExecutionsTool(context);
			const ctx = createToolCtx();

			await tool.execute!({ workflowId: 'wf-1' }, ctx);

			const suspend = (ctx as unknown as { agent: { suspend: jest.Mock } }).agent.suspend;
			expect(suspend).toHaveBeenCalledTimes(1);

			const payload = (suspend.mock.calls as unknown[][])[0][0] as {
				requestId: string;
				message: string;
				severity: string;
			};
			expect(payload.message).toContain('wf-1');
			expect(payload.severity).toBe('warning');
			expect(context.workspaceService!.cleanupTestExecutions).not.toHaveBeenCalled();
		});

		it('deletes executions when resumed with approved: true', async () => {
			const context = createMockContext();
			(context.workspaceService!.cleanupTestExecutions as jest.Mock).mockResolvedValue({
				deletedCount: 5,
			});
			const tool = createCleanupTestExecutionsTool(context);
			const ctx = createToolCtx({ resumeData: { approved: true } });

			const result = (await tool.execute!(
				{ workflowId: 'wf-1', olderThanHours: 2 },
				ctx,
			)) as Record<string, unknown>;

			expect(context.workspaceService!.cleanupTestExecutions).toHaveBeenCalledWith('wf-1', {
				olderThanHours: 2,
			});
			expect(result).toEqual({ deletedCount: 5 });
		});

		it('returns denied when resumed with approved: false', async () => {
			const context = createMockContext();
			const tool = createCleanupTestExecutionsTool(context);
			const ctx = createToolCtx({ resumeData: { approved: false } });

			const result = (await tool.execute!({ workflowId: 'wf-1' }, ctx)) as Record<string, unknown>;

			expect(result).toEqual({
				deletedCount: 0,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.workspaceService!.cleanupTestExecutions).not.toHaveBeenCalled();
		});
	});

	describe('always_allow permission', () => {
		it('skips confirmation and cleans up immediately', async () => {
			const context = createMockContext({
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				cleanupTestExecutions: 'always_allow',
			});
			(context.workspaceService!.cleanupTestExecutions as jest.Mock).mockResolvedValue({
				deletedCount: 3,
			});
			const tool = createCleanupTestExecutionsTool(context);
			const ctx = createToolCtx();

			const result = (await tool.execute!({ workflowId: 'wf-1' }, ctx)) as Record<string, unknown>;

			const suspend = (ctx as unknown as { agent: { suspend: jest.Mock } }).agent.suspend;
			expect(suspend).not.toHaveBeenCalled();
			expect(result).toEqual({ deletedCount: 3 });
		});
	});

	describe('error handling', () => {
		it('propagates service errors', async () => {
			const context = createMockContext({
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				cleanupTestExecutions: 'always_allow',
			});
			(context.workspaceService!.cleanupTestExecutions as jest.Mock).mockRejectedValue(
				new Error('Workflow not found'),
			);
			const tool = createCleanupTestExecutionsTool(context);
			const ctx = createToolCtx();

			await expect(tool.execute!({ workflowId: 'bad' }, ctx)).rejects.toThrow('Workflow not found');
		});
	});
});
