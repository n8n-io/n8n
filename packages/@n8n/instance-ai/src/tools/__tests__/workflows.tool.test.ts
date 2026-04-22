import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';
import { analyzeWorkflow } from '../workflows/setup-workflow.service';
import { createWorkflowsTool } from '../workflows.tool';

// Mock the setup-workflow.service module to avoid pulling in heavy dependencies
jest.mock('../workflows/setup-workflow.service', () => ({
	analyzeWorkflow: jest.fn().mockResolvedValue([]),
	applyNodeCredentials: jest.fn().mockResolvedValue({ failed: [] }),
	applyNodeParameters: jest.fn().mockResolvedValue({ failed: [] }),
	applyNodeChanges: jest.fn().mockResolvedValue({ failed: [] }),
	buildCompletedReport: jest.fn().mockReturnValue([]),
}));

// Mock the dynamic import of @n8n/workflow-sdk used by get-as-code
jest.mock('@n8n/workflow-sdk', () => ({
	generateWorkflowCode: jest.fn().mockReturnValue('// generated code'),
}));

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn().mockResolvedValue({
				name: 'Test WF',
				nodes: [],
				connections: {},
			}),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn().mockResolvedValue({ activeVersionId: 'v1' }),
			unpublish: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('workflows tool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('surface filtering', () => {
		it('should support get-as-code on full surface', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			const result = await tool.execute!(
				{ action: 'get-as-code', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({
				workflowId: 'w1',
				name: 'Test WF',
				code: '// generated code',
			});
		});
	});

	describe('version actions', () => {
		it('should support version actions when listVersions exists', async () => {
			const context = createMockContext();
			const versions = [{ id: 'v1', versionId: 1 }];
			context.workflowService.listVersions = jest.fn().mockResolvedValue(versions);
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!(
				{ action: 'list-versions', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({ versions });
		});

		it('should support update-version when updateVersion exists', async () => {
			const context = createMockContext();
			context.workflowService.listVersions = jest.fn();
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();
			context.workflowService.updateVersion = jest.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!(
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{} as never,
			);

			expect(result).toEqual({ success: true });
		});
	});

	describe('list action', () => {
		it('should call workflowService.list with options', async () => {
			const workflows = [
				{
					id: 'wf1',
					name: 'Test Workflow',
					versionId: 'v1',
					activeVersionId: null,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
				},
			];
			const context = createMockContext();
			(context.workflowService.list as jest.Mock).mockResolvedValue(workflows);

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'list', query: 'test', limit: 10 }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ limit: 10, query: 'test' });
			expect(result).toEqual({ workflows });
		});
	});

	describe('get action', () => {
		it('should call workflowService.get with workflowId', async () => {
			const detail = {
				id: 'wf1',
				name: 'Test WF',
				nodes: [],
				connections: {},
				versionId: 'v1',
				activeVersionId: null,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue(detail);

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'get', workflowId: 'wf1' }, {} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(result).toEqual(detail);
		});
	});

	describe('delete action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('My WF'),
				severity: 'warning',
			});
		});

		it('should fall back to workflowId in message when lookup fails', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockRejectedValue(new Error('not found'));
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('"wf1"'),
			});
		});

		it('should archive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.archive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: false } },
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
		});
	});

	describe('publish action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { publishWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
		});

		it('should suspend for confirmation and then publish when approved', async () => {
			const context = createMockContext();
			(context.workflowService.publish as jest.Mock).mockResolvedValue({
				activeVersionId: 'v2',
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.publish).toHaveBeenCalledWith('wf1', {
				versionId: undefined,
			});
			expect(result).toEqual({ success: true, activeVersionId: 'v2' });
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Publish workflow "My WF" (ID: wf1)?',
				severity: 'warning',
			});
		});
	});

	describe('setup action', () => {
		it('should analyze workflow and suspend for user setup', async () => {
			const setupRequests = [
				{
					node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
					credentialType: 'slackApi',
					needsAction: true,
				},
			];
			(analyzeWorkflow as jest.Mock).mockResolvedValue(setupRequests);

			const context = createMockContext();
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Configure credentials for your workflow',
				severity: 'info',
				setupRequests,
				workflowId: 'wf1',
			});
		});

		it('should return success when no nodes need setup', async () => {
			(analyzeWorkflow as jest.Mock).mockResolvedValue([]);

			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: { resumeData: undefined },
			} as never);

			expect(result).toEqual({ success: true, reason: 'No nodes require setup.' });
		});
	});

	describe('unpublish action', () => {
		it('should unpublish when approved', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await tool.execute!({ action: 'unpublish', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.unpublish).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await tool.execute!({ action: 'unpublish', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Unpublish workflow "My WF" (ID: wf1)?',
				severity: 'warning',
			});
		});
	});
});
