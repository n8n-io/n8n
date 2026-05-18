import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';
import { analyzeWorkflow, applyNodeChanges } from '../workflows/setup-workflow.service';
import { createWorkflowsTool, type WorkflowAction } from '../workflows.tool';

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
			get: jest.fn().mockResolvedValue({
				id: 'wf1',
				name: 'Test WF',
				versionId: 'v1',
				activeVersionId: null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			}),
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

function getInputSchema(tool: unknown): { safeParse: (input: unknown) => { success: boolean } } {
	return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
		.inputSchema;
}

function getDescription(tool: unknown): string {
	return (tool as { description: string }).description;
}

describe('workflows tool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('action filtering', () => {
		const builderWorkflowActions = [
			'list',
			'get',
			'get-as-code',
		] as const satisfies readonly WorkflowAction[];

		it('should support get-as-code by default', async () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context);

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

		it('should describe only explicitly allowed actions', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
				descriptionPrefix: 'Inspect workflows during build',
			});

			expect(getDescription(tool)).toContain('Inspect workflows during build');
			expect(getDescription(tool)).not.toContain('set up');
			expect(getDescription(tool)).not.toContain('publish');
			expect(getDescription(tool)).not.toContain('archive');
		});

		it.each([
			[{ action: 'list' }],
			[{ action: 'get', workflowId: 'w1' }],
			[{ action: 'get-as-code', workflowId: 'w1' }],
		])('should support explicitly allowed action %p', (input) => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse(input).success).toBe(true);
		});

		it.each([
			[{ action: 'setup', workflowId: 'w1' }],
			[{ action: 'publish', workflowId: 'w1' }],
			[{ action: 'unpublish', workflowId: 'w1' }],
			[{ action: 'delete', workflowId: 'w1' }],
			[{ action: 'unarchive', workflowId: 'w1' }],
			[{ action: 'list-versions', workflowId: 'w1' }],
			[{ action: 'get-version', workflowId: 'w1', versionId: 'v1' }],
			[{ action: 'restore-version', workflowId: 'w1', versionId: 'v1' }],
			[{ action: 'update-version', workflowId: 'w1', versionId: 'v1', name: 'v1' }],
		])('should reject action %p when it is not explicitly allowed', (input) => {
			const context = createMockContext();
			context.workflowService.listVersions = jest.fn();
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();
			context.workflowService.updateVersion = jest.fn();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse(input).success).toBe(false);
		});

		it('should reject builder-disallowed publish at the schema boundary', () => {
			const context = createMockContext();
			const tool = createWorkflowsTool(context, {
				allowedActions: builderWorkflowActions,
			});
			const schema = getInputSchema(tool);

			expect(schema.safeParse({ action: 'publish', workflowId: 'w1' }).success).toBe(false);
			expect(context.workflowService.publish).not.toHaveBeenCalled();
		});
	});

	describe('version actions', () => {
		it('should support version actions when listVersions exists', async () => {
			const context = createMockContext();
			const versions = [{ id: 'v1', versionId: 1 }];
			context.workflowService.listVersions = jest.fn().mockResolvedValue(versions);
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!(
				{ action: 'list-versions', workflowId: 'w1' } as never,
				{} as never,
			);

			expect(result).toEqual({ versions });
		});

		it('should support update-version when updateVersion exists and updateWorkflow is always_allow', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'always_allow' },
			});
			context.workflowService.listVersions = jest.fn();
			context.workflowService.getVersion = jest.fn();
			context.workflowService.restoreVersion = jest.fn();
			context.workflowService.updateVersion = jest.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context);
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
			expect(context.workflowService.updateVersion).toHaveBeenCalledWith('w1', '1', {
				name: 'v1',
				description: undefined,
			});
		});

		it('should suspend update-version for approval by default', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = jest.fn().mockResolvedValue({ success: true });
			const suspend = jest.fn().mockResolvedValue(undefined);

			const tool = createWorkflowsTool(context);
			await tool.execute!(
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'renamed',
					description: null,
				} as never,
				{ agent: { suspend, resumeData: undefined } } as never,
			);

			// Note: like other suspending handlers in this file, we don't assert on
			// the tool's return value — the test wrapper validates the payload
			// against the strict setupSuspendSchema and returns a wrapped error
			// when minimal `{requestId,message,severity}` payloads come through.
			// At runtime the agent loop suspends correctly; this is purely a
			// test-infrastructure quirk shared with handleDelete / handlePublish /
			// handleUnpublish / handleRestoreVersion.
			expect(suspend).toHaveBeenCalledTimes(1);
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('"renamed"'),
				severity: 'info',
			});
			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
		});

		it('should block update-version when updateWorkflow is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});
			context.workflowService.updateVersion = jest.fn();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!(
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'renamed',
				} as never,
				{} as never,
			);

			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		});

		it('should proceed with update-version when resume approves', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = jest.fn().mockResolvedValue({ success: true });

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!(
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'renamed',
				} as never,
				{ agent: { resumeData: { approved: true } } } as never,
			);

			expect(context.workflowService.updateVersion).toHaveBeenCalledTimes(1);
			expect(result).toEqual({ success: true });
		});

		it('should deny update-version when resume rejects', async () => {
			const context = createMockContext();
			context.workflowService.updateVersion = jest.fn();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!(
				{
					action: 'update-version',
					workflowId: 'w1',
					versionId: '1',
					name: 'renamed',
				} as never,
				{ agent: { resumeData: { approved: false } } } as never,
			);

			expect(context.workflowService.updateVersion).not.toHaveBeenCalled();
			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'User denied the action',
			});
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

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'list', query: 'test', limit: 10 }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ limit: 10, query: 'test' });
			expect(result).toEqual({ workflows });
		});

		it('should pass archived status when listing archived workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as jest.Mock).mockResolvedValue([]);

			const tool = createWorkflowsTool(context);
			await tool.execute!({ action: 'list', status: 'archived' }, {} as never);

			expect(context.workflowService.list).toHaveBeenCalledWith({ status: 'archived' });
		});

		it('should pass all status when listing all workflows', async () => {
			const context = createMockContext();
			(context.workflowService.list as jest.Mock).mockResolvedValue([]);

			const tool = createWorkflowsTool(context);
			await tool.execute!({ action: 'list', status: 'all' }, {} as never);

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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('My WF'),
				severity: 'warning',
			});
			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Awaiting confirmation',
			});
		});

		it('should fall back to workflowId in message when lookup fails', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockRejectedValue(new Error('not found'));
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'delete', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.archive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
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

	describe('unarchive action', () => {
		it('should return denied when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { deleteWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'unarchive', workflowId: 'wf1' }, {} as never);

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

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'unarchive', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(context.workflowService.get).toHaveBeenCalledWith('wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: expect.stringContaining('Archived WF'),
				severity: 'warning',
			});
			expect(suspend.mock.calls[0][0].message).toContain('will not publish it');
			expect(result).toEqual({
				success: false,
				denied: true,
				reason: 'Awaiting confirmation',
			});
		});

		it('should return the suspension result when approval is pending', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'Archived WF',
			});
			const suspension = { suspended: true };
			const suspend = jest.fn().mockResolvedValue(suspension);

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'unarchive', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(result).toBe(suspension);
			expect(context.workflowService.unarchive).not.toHaveBeenCalled();
		});

		it('should unarchive when approved via resume', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'unarchive', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.unarchive).toHaveBeenCalledWith('wf1');
			expect(result).toEqual({ success: true });
		});

		it('should return denied when user rejects', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'unarchive', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: false } },
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

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.publish).toHaveBeenCalledWith('wf1', {
				versionId: undefined,
			});
			expect(result).toEqual({
				success: true,
				activeVersionId: 'v2',
				publishedWorkflowIds: ['wf1'],
			});
		});

		it('should publish direct Execute Workflow dependencies before the main workflow', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue({
				name: 'Parent',
				nodes: [
					{
						name: 'Call A',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
					{
						name: 'Call B',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: { value: 'sub-b' } },
					},
					{
						name: 'Call A Again',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
				],
				connections: {},
			});
			(context.workflowService.publish as jest.Mock).mockResolvedValue({
				activeVersionId: 'v-main',
			});

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.publish).toHaveBeenNthCalledWith(1, 'sub-a');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(2, 'sub-b');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(3, 'wf1', {
				versionId: undefined,
			});
			expect(result).toEqual({
				success: true,
				activeVersionId: 'v-main',
				publishedWorkflowIds: ['sub-a', 'sub-b', 'wf1'],
				supportingWorkflowIds: ['sub-a', 'sub-b'],
			});
		});

		it('should roll back direct Execute Workflow dependencies when the main workflow publish fails', async () => {
			const context = createMockContext();
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue({
				name: 'Parent',
				nodes: [
					{
						name: 'Call A',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
					{
						name: 'Call B',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-b' },
					},
				],
				connections: {},
			});
			(context.workflowService.get as jest.Mock).mockImplementation((workflowId: string) => ({
				id: workflowId,
				name: workflowId,
				versionId: `${workflowId}-draft`,
				activeVersionId: workflowId === 'sub-a' ? 'sub-a-previous' : null,
				isArchived: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
				nodes: [],
				connections: {},
			}));
			(context.workflowService.publish as jest.Mock).mockImplementation((workflowId: string) => {
				if (workflowId === 'wf1') throw new Error('Main publish failed');
				return { activeVersionId: `${workflowId}-active` };
			});

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {
				agent: { resumeData: { approved: true } },
			} as never);

			expect(context.workflowService.publish).toHaveBeenNthCalledWith(1, 'sub-a');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(2, 'sub-b');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(3, 'wf1', {
				versionId: undefined,
			});
			expect(context.workflowService.unpublish).toHaveBeenCalledWith('sub-b');
			expect(context.workflowService.publish).toHaveBeenNthCalledWith(4, 'sub-a', {
				versionId: 'sub-a-previous',
			});
			expect(result).toEqual({
				success: false,
				error: 'Main publish failed',
				rolledBackWorkflowIds: ['sub-b', 'sub-a'],
			});
		});

		it('should suspend for confirmation using the looked-up workflow name', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context);
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

		it('should include direct Execute Workflow dependencies in publish confirmation', async () => {
			const context = createMockContext();
			(context.workflowService.get as jest.Mock).mockResolvedValue({
				id: 'wf1',
				name: 'My WF',
			});
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue({
				name: 'Parent',
				nodes: [
					{
						name: 'Call A',
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { source: 'database', workflowId: 'sub-a' },
					},
				],
				connections: {},
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context);
			await tool.execute!({ action: 'publish', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Publish workflow "My WF" (ID: wf1) and 1 referenced supporting workflow(s)?',
				severity: 'warning',
			});
		});
	});

	describe('setup action', () => {
		it('should analyze workflow and suspend for user setup', async () => {
			const actionableSetupRequest = {
				node: { name: 'Slack', type: 'n8n-nodes-base.slack' },
				credentialType: 'slackApi',
				needsAction: true,
			};
			const setupRequests = [
				actionableSetupRequest,
				{
					node: { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
					isTrigger: true,
					isTestable: true,
					needsAction: false,
				},
			];
			(analyzeWorkflow as jest.Mock).mockResolvedValue(setupRequests);

			const context = createMockContext();
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context);
			await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(analyzeWorkflow).toHaveBeenCalledWith(context, 'wf1');
			expect(suspend).toHaveBeenCalled();
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'Configure credentials for your workflow',
				severity: 'info',
				setupRequests: [actionableSetupRequest],
				workflowId: 'wf1',
			});
		});

		it('should return success when setup analysis only has non-actionable requests', async () => {
			(analyzeWorkflow as jest.Mock).mockResolvedValue([
				{
					node: { name: 'Webhook', type: 'n8n-nodes-base.webhook' },
					isTrigger: true,
					isTestable: true,
					needsAction: false,
				},
			]);

			const context = createMockContext();
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(result).toEqual({ success: true, reason: 'No nodes require setup.' });
			expect(suspend).not.toHaveBeenCalled();
		});

		it('should return success when no nodes need setup', async () => {
			(analyzeWorkflow as jest.Mock).mockResolvedValue([]);

			const context = createMockContext();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: { resumeData: undefined },
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

			const tool = createWorkflowsTool(context);
			await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: {
					resumeData: {
						approved: true,
						action: 'apply',
						nodeParameters: { 'HTTP Request': { url: 'https://example.com/api' } },
					},
				},
			} as never);

			expect(applyNodeChanges).toHaveBeenCalledWith(context, 'wf1', undefined, {
				'HTTP Request': { url: 'https://example.com/api' },
			});
		});

		it('should block setup when updateWorkflow is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});
			const suspend = jest.fn();

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(analyzeWorkflow).not.toHaveBeenCalled();
			expect(applyNodeChanges).not.toHaveBeenCalled();
			expect(suspend).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		});

		it('should block setup apply when updateWorkflow is blocked', async () => {
			const context = createMockContext({
				permissions: { updateWorkflow: 'blocked' },
			});

			const tool = createWorkflowsTool(context);
			const result = await tool.execute!({ action: 'setup', workflowId: 'wf1' }, {
				agent: {
					resumeData: {
						approved: true,
						action: 'apply',
						nodeParameters: { 'HTTP Request': { url: 'https://example.com/api' } },
					},
				},
			} as never);

			expect(applyNodeChanges).not.toHaveBeenCalled();
			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
		});
	});

	describe('unpublish action', () => {
		it('should unpublish when approved', async () => {
			const context = createMockContext();

			const tool = createWorkflowsTool(context);
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

			const tool = createWorkflowsTool(context);
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
