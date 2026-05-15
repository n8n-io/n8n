import type { InstanceAiPermissions } from '@n8n/api-types';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { analyzeWorkflow, applyNodeChanges } from '../workflows/setup-workflow.service';
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
			unarchive: jest.fn(),
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

			const result = await executeTool(
				tool,
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
			const result = await executeTool(
				tool,
				{ action: 'list-versions', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({ versions });
		});

		it('should support update-version when updateVersion exists', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'always_allow' },
			});
			context.workflowService.listVersions = jest.fn();
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();
			context.workflowService.updateVersion = jest.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
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

		it('should block update-version when updateWorkflow permission is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});
			context.workflowService.updateVersion = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
		});

		it('should suspend update-version for approval by default', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = jest.fn();
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
					description: null,
				} as never,
				{ suspend, resumeData: undefined } as never,
			);

			expect(suspend).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Update workflow version "1" — set name to "v1", description to (cleared)?',
					severity: 'info',
				}),
			);
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
		});

		it('should update-version when approval resumes approved', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = jest.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{ resumeData: { approved: true } } as never,
			);

			expect(result).toEqual({ success: true });
			expect(context.workflowService.updateVersion).toHaveBeenCalledWith('w1', '1', {
				name: 'v1',
				description: undefined,
			});
		});

		it('should not update-version when approval resumes denied', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'v1',
				} as never,
				{ resumeData: { approved: false } } as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
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
					isArchived: false,
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
				},
			];
			const context = createMockContext();
			(context.workflowService.list as jest.Mock).mockResolvedValue(workflows);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list', query: 'test', limit: 10 },
				{} as never,
			);

			expect(context.workflowService.list).toHaveBeenCalledWith({ limit: 10, query: 'test' });
			expect(result).toEqual({ workflows });
		});

		it('should pass archived status when listing archived workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as jest.Mock).mockResolvedValue([]);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', status: 'archived' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'archived' });
		});

		it('should pass all status when listing all workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as jest.Mock).mockResolvedValue([]);

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'list', status: 'all' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'all' });
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
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue(detail);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'get', workflowId: 'wf1' }, {} as never);

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
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {} as never);

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
			await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
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
			await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('"wf1"'),
			});
		});

		it('should archive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.archive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'delete', workflowId: 'wf1' }, {
				resumeData: { approved: false },
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
		});
	});

	describe('unarchive action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'unarchive', workflowId: 'wf1' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Archived WF',
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('Archived WF'),
				severity: 'warning',
			});
			expect(suspend.mock.calls[0][0].message).toContain('will not publish it');
		});

		it('should return the suspension result when approval is pending', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Archived WF',
			});
			const suspension = { suspended: true };
			const suspend = jest.fn().mockResolvedValue(suspension);

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
			} as never);

			expect(result).toBe(suspension);
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});

		it('should unarchive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				resumeData: { approved: true },
			} as never);

			expect(context.workflowService.unarchive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unarchive', workflowId: 'wf1' }, {
				resumeData: { approved: false },
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});
	});

	describe('publish action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { publishWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {} as never);

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
			const result = await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				resumeData: { approved: true },
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
			await executeTool(tool, { action: 'publish', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
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
		it('should block setup when updateWorkflow permission is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: undefined,
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(analyzeWorkflow).not.toHaveBeenCalled();
			expect(applyNodeChanges).not.toHaveBeenCalled();
		});

		it('should block setup apply when updateWorkflow permission is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: true,
					action: 'apply',
					nodeParameters: { Slack: { channel: '#ops' } },
				},
			} as never);

			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Action blocked by admin',
			});
			expect(analyzeWorkflow).not.toHaveBeenCalled();
			expect(applyNodeChanges).not.toHaveBeenCalled();
		});

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
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
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
			const result = await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: undefined,
			} as never);

			expect(result).toEqual({ success: true, reason: 'No nodes require setup.' });
		});

		it('forwards resumeData.nodeParameters to applyNodeChanges on apply', async () => {
			// Regression: even though the FE sends `nodeParameters` in the confirm
			// POST, the e2e test showed the workflow's parameter was empty after
			// apply. This pins down the tool-layer contract between the resume
			// payload and the service call — if this ever drifts we catch it here.
			(analyzeWorkflow as jest.Mock).mockResolvedValue([]);
			(applyNodeChanges as jest.Mock).mockResolvedValue({ applied: ['HTTP Request'], failed: [] });

			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue({
				name: 'Test WF',
				nodes: [
					{
						id: 'http',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 4.2,
						position: [0, 0],
						parameters: { method: 'GET', url: '', authentication: 'none' },
					},
				],
				connections: {},
			});

			const tool = createWorkflowsTool(context, 'full');
			await executeTool(tool, { action: 'setup', workflowId: 'wf1' }, {
				resumeData: {
					approved: true,
					action: 'apply',
					nodeParameters: { 'HTTP Request': { url: 'https://example.com/api' } },
				},
			} as never);

			expect(applyNodeChanges).toHaveBeenCalledWith(context, 'wf1', undefined, {
				'HTTP Request': { url: 'https://example.com/api' },
			});
		});
	});

	describe('unpublish action', () => {
		it('should unpublish when approved', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context, 'full');
			const result = await executeTool(tool, { action: 'unpublish', workflowId: 'wf1' }, {
				resumeData: { approved: true },
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
			await executeTool(tool, { action: 'unpublish', workflowId: 'wf1' }, {
				suspend,
				resumeData: undefined,
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
