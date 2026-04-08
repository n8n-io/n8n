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
		it('should exclude get-as-code from orchestrator surface', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'orchestrator');

			expect(tool.description).not.toContain('get-as-code');
		});

		it('should include get-as-code in full surface', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			expect(tool.description).toContain('get-as-code');
		});
	});

	describe('version actions', () => {
		it('should include version actions when listVersions exists', () => {
			const context = createMockContext();
			context.workflowService.listVersions = jest.fn();
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();

			const tool = createWorkflowsTool(context, 'full');

			expect(tool.description).toContain('list-versions');
			expect(tool.description).toContain('get-version');
			expect(tool.description).toContain('restore-version');
		});

		it('should include update-version when updateVersion exists', () => {
			const context = createMockContext();
			context.workflowService.listVersions = jest.fn();
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();
			context.workflowService.updateVersion = jest.fn();

			const tool = createWorkflowsTool(context, 'full');

			expect(tool.description).toContain('update-version');
		});

		it('should not include version actions when listVersions is absent', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, 'full');

			expect(tool.description).not.toContain('list-versions');
			expect(tool.description).not.toContain('update-version');
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

		it('should suspend for confirmation when no resumeData', async () => {
			const context = createMockContext();
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await tool.execute!({ action: 'delete', workflowId: 'wf1', workflowName: 'My WF' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(suspend.mock.calls[0][0]).toMatchObject({
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				message: expect.stringContaining('My WF'),
				severity: 'warning',
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
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
	});
});
