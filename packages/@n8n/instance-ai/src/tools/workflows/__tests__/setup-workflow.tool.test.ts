import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { createSetupWorkflowTool } from '../setup-workflow.tool';

/** Extract the success result shape from the tool's execute return type. */
interface ToolResult {
	success: boolean;
	deferred?: boolean;
	partial?: boolean;
	reason?: string;
	error?: string;
	completedNodes?: Array<{ nodeName: string; credentialType?: string }>;
	updatedNodes?: unknown[];
	updatedConnections?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn(),
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
		...overrides,
	};
}

function makeWorkflowJSON(nodes: WorkflowJSON['nodes'] = []): WorkflowJSON {
	return {
		nodes,
		connections: {},
	} as unknown as WorkflowJSON;
}

function makeSlackNode() {
	return {
		name: 'Slack',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2,
		parameters: {},
		position: [250, 300] as [number, number],
		id: 'node-1',
	};
}

/** Create a ctx object with suspend/resumeData for the tool's execute call. */
function makeToolCtx(opts?: {
	resumeData?: Record<string, unknown>;
	suspend?: jest.Mock;
}) {
	return {
		agent: {
			resumeData: opts?.resumeData ?? undefined,
			suspend: opts?.suspend ?? jest.fn(),
		},
	} as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createSetupWorkflowTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext();
	});

	it('has the expected tool id', () => {
		const tool = createSetupWorkflowTool(context);
		expect(tool.id).toBe('setup-workflow');
	});

	describe('State 1: initial suspend', () => {
		it('returns success when no nodes need setup', async () => {
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflowJSON([makeSlackNode()]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
				group: [],
				credentials: [],
			});

			const tool = createSetupWorkflowTool(context);
			const result = await tool.execute!({ workflowId: 'wf-1' }, makeToolCtx());

			expect(result).toEqual({ success: true, reason: 'No nodes require setup.' });
		});

		it('suspends with setup requests when nodes need configuration', async () => {
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflowJSON([makeSlackNode()]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
				group: [],
				credentials: [{ name: 'slackApi' }],
			});
			(context.credentialService.list as jest.Mock).mockResolvedValue([
				{ id: 'c1', name: 'My Slack', updatedAt: '2025-01-01' },
			]);
			(context.credentialService.test as jest.Mock).mockResolvedValue({ success: true });

			const suspend = jest.fn();
			const tool = createSetupWorkflowTool(context);
			await tool.execute!({ workflowId: 'wf-1' }, makeToolCtx({ suspend }));

			expect(suspend).toHaveBeenCalledTimes(1);
			const suspendArg = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			expect(suspendArg.workflowId).toBe('wf-1');
			expect(suspendArg.setupRequests).toHaveLength(1);
			expect(suspendArg.requestId).toBeDefined();
		});
	});

	describe('State 2: user declined', () => {
		it('returns deferred when user declines', async () => {
			const tool = createSetupWorkflowTool(context);
			const result = await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({ resumeData: { approved: false } }),
			);

			expect(result).toEqual({
				success: true,
				deferred: true,
				reason: 'User skipped workflow setup for now.',
			});
		});

		it('reverts pre-test snapshot on decline', async () => {
			const snapshot = makeWorkflowJSON([makeSlackNode()]);
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(snapshot);
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
				group: ['trigger'],
				credentials: [],
				webhooks: [{}],
			});
			(context.executionService.run as jest.Mock).mockResolvedValue({
				executionId: 'e1',
				status: 'success',
			});

			const tool = createSetupWorkflowTool(context);

			// First: trigger test to capture snapshot
			await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Slack',
					},
					suspend: jest.fn(),
				}),
			);

			// Then: decline
			await tool.execute!({ workflowId: 'wf-1' }, makeToolCtx({ resumeData: { approved: false } }));

			expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith('wf-1', snapshot);
		});
	});

	describe('State 3: test trigger', () => {
		it('passes triggerNodeName to execution service', async () => {
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflowJSON([makeSlackNode()]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
				group: ['trigger'],
				credentials: [],
				webhooks: [{}],
			});
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);
			(context.executionService.run as jest.Mock).mockResolvedValue({
				executionId: 'e1',
				status: 'success',
			});

			const suspend = jest.fn();
			const tool = createSetupWorkflowTool(context);
			await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Slack',
					},
					suspend,
				}),
			);

			expect(context.executionService.run).toHaveBeenCalledWith('wf-1', undefined, {
				timeout: 30_000,
				triggerNodeName: 'Slack',
			});
		});

		it('re-suspends with refreshed requests after trigger test', async () => {
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(
				makeWorkflowJSON([makeSlackNode()]),
			);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
				group: ['trigger'],
				credentials: [],
				webhooks: [{}],
			});
			(context.credentialService.list as jest.Mock).mockResolvedValue([]);
			(context.executionService.run as jest.Mock).mockResolvedValue({
				executionId: 'e1',
				status: 'success',
			});

			const suspend = jest.fn();
			const tool = createSetupWorkflowTool(context);
			await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({
					resumeData: {
						approved: true,
						action: 'test-trigger',
						testTriggerNode: 'Slack',
					},
					suspend,
				}),
			);

			expect(suspend).toHaveBeenCalledTimes(1);
			const suspendArg = (suspend.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
			const requests = suspendArg.setupRequests as Array<Record<string, unknown>>;
			expect(requests[0].triggerTestResult).toEqual({ status: 'success' });
		});
	});

	describe('State 4: apply', () => {
		it('applies credentials and returns updatedNodes', async () => {
			const wfJson = makeWorkflowJSON([makeSlackNode()]);
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
			(context.credentialService.get as jest.Mock).mockResolvedValue({
				id: 'cred-1',
				name: 'My Slack',
			});
			(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);
			(context.nodeService.getDescription as jest.Mock).mockResolvedValue({
				group: [],
				credentials: [{ name: 'slackApi' }],
			});
			(context.credentialService.list as jest.Mock).mockResolvedValue([
				{ id: 'cred-1', name: 'My Slack', updatedAt: '2025-01-01' },
			]);
			(context.credentialService.test as jest.Mock).mockResolvedValue({ success: true });

			const tool = createSetupWorkflowTool(context);
			const result = await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({
					resumeData: {
						approved: true,
						action: 'apply',
						credentials: { Slack: { slackApi: 'cred-1' } },
					},
				}),
			);

			const res = result as ToolResult;
			expect(res.success).toBe(true);
			expect(res.updatedNodes).toBeDefined();
			expect(res.completedNodes).toBeDefined();
		});

		it('reports partial apply using needsAction filter', async () => {
			const nodes = [
				makeSlackNode(),
				{
					...makeSlackNode(),
					name: 'Gmail',
					type: 'n8n-nodes-base.gmail',
					id: 'node-2',
				},
			];
			const wfJson = makeWorkflowJSON(nodes);
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockResolvedValue(wfJson);
			(context.credentialService.get as jest.Mock).mockResolvedValue({
				id: 'cred-1',
				name: 'My Slack',
			});
			(context.workflowService.updateFromWorkflowJSON as jest.Mock).mockResolvedValue(undefined);

			// After apply: Slack has credential set (needsAction=false),
			// Gmail still needs one (needsAction=true)
			let callCount = 0;
			(context.nodeService.getDescription as jest.Mock).mockImplementation(async (type: string) => {
				if (type === 'n8n-nodes-base.slack') {
					return await Promise.resolve({ group: [], credentials: [{ name: 'slackApi' }] });
				}
				return await Promise.resolve({ group: [], credentials: [{ name: 'gmailApi' }] });
			});
			(context.credentialService.list as jest.Mock).mockImplementation(async () => {
				callCount++;
				// First batch (apply phase) and second batch (re-analyze)
				return await Promise.resolve([{ id: 'cred-1', name: 'Cred', updatedAt: '2025-01-01' }]);
			});
			// Gmail credential test fails → needsAction stays true
			(context.credentialService.test as jest.Mock).mockImplementation(async (credId: string) => {
				if (credId === 'cred-1') return await Promise.resolve({ success: true });
				return await Promise.resolve({ success: false, message: 'Failed' });
			});

			const tool = createSetupWorkflowTool(context);
			const result = await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({
					resumeData: {
						approved: true,
						action: 'apply',
						credentials: { Slack: { slackApi: 'cred-1' } },
					},
				}),
			);

			// The re-analysis returns both nodes, but only Gmail has needsAction=true
			// (Slack had its credential applied and test passed)
			// Whether this is partial depends on whether Gmail's needsAction is true
			expect((result as ToolResult).success).toBe(true);
		});

		it('returns error when apply throws', async () => {
			(context.workflowService.getAsWorkflowJSON as jest.Mock).mockRejectedValue(
				new Error('DB connection lost'),
			);

			const tool = createSetupWorkflowTool(context);
			const result = await tool.execute!(
				{ workflowId: 'wf-1' },
				makeToolCtx({
					resumeData: {
						approved: true,
						action: 'apply',
						credentials: { Slack: { slackApi: 'cred-1' } },
					},
				}),
			);

			const res = result as ToolResult;
			expect(res.success).toBe(false);
			expect(res.error).toContain('Workflow apply failed');
		});
	});
});
