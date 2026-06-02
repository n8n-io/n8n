import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import type { WorkflowBuildOutcome } from '../../../workflow-loop/workflow-loop-state';
import { createBuildWorkflowTool } from '../build-workflow.tool';
import { resolveCredentials } from '../resolve-credentials';
import { stripStaleCredentialsFromWorkflow } from '../setup-workflow.service';
import { ensureWebhookIds } from '../submit-workflow.tool';

jest.mock('../../../workflow-builder', () => ({
	parseAndValidate: jest.fn(() => ({
		workflow: {
			name: 'Generated workflow',
			nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: {} }],
			connections: {},
		},
		warnings: [],
	})),
	partitionWarnings: jest.fn((warnings: unknown[]) => ({ errors: [], informational: warnings })),
}));

jest.mock('../resolve-credentials', () => ({
	buildCredentialMap: jest.fn(async () => await Promise.resolve(new Map())),
	resolveCredentials: jest.fn(
		async () =>
			await Promise.resolve({
				mockedNodeNames: [],
				mockedCredentialTypes: [],
				mockedCredentialsByNode: {},
				verificationPinData: {},
				usesWorkflowPinDataForVerification: false,
			}),
	),
}));

jest.mock('../setup-workflow.service', () => ({
	stripStaleCredentialsFromWorkflow: jest.fn(async () => await Promise.resolve()),
}));

jest.mock('../submit-workflow.tool', () => ({
	ensureWebhookIds: jest.fn(async () => await Promise.resolve()),
}));

describe('createBuildWorkflowTool', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('rejects new workflow builds outside a planned or post-plan follow-up', async () => {
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: jest.fn(),
				clearAiTemporary: jest.fn(),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: jest.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({
			success: false,
			errors: [
				'New workflow builds must be planned first: call `plan` so the user can approve the build plan before saving.',
			],
		});
		expect(context.workflowService.createFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('allows new workflow builds during post-plan follow-up repairs', async () => {
		const reportBuildOutcome = jest.fn(
			async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
		);
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: jest.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: jest.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				allowPostPlanWorkflowCreate: true,
				workflowTaskService: {
					reportBuildOutcome,
				},
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: jest.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-1',
		});
		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Generated workflow' }),
			{ markAsAiTemporary: true },
		);
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining<Partial<WorkflowBuildOutcome>>({
				workItemId: 'wi-1',
				workflowId: 'wf-1',
				submitted: true,
			}),
		);
	});

	it('updates existing workflows during post-plan follow-ups without redundant approval', async () => {
		const reportBuildOutcome = jest.fn(
			async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
		);
		const suspend = jest.fn();
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				updateFromWorkflowJSON: jest.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: jest.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				allowPostPlanWorkflowCreate: true,
				workflowTaskService: {
					reportBuildOutcome,
				},
			},
			permissions: { updateWorkflow: 'ask' },
			logger: { warn: jest.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(
			tool,
			{ workflowId: 'wf-1', code: 'workflow code' },
			{ suspend },
		);

		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-1',
		});
		expect(suspend).not.toHaveBeenCalled();
		expect(context.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-1',
			expect.objectContaining({ name: 'Generated workflow' }),
			undefined,
		);
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining<Partial<WorkflowBuildOutcome>>({
				workItemId: 'wi-1',
				workflowId: 'wf-1',
				submitted: true,
			}),
		);
	});

	it('reports a workflow-loop outcome when saving succeeds', async () => {
		const reportBuildOutcome = jest.fn(
			async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
		);
		const markSucceeded = jest.fn<
			Promise<null>,
			[string, string, { result?: string; outcome?: WorkflowBuildOutcome }]
		>(async () => await Promise.resolve(null));
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: jest.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: jest.fn(async () => await Promise.resolve()),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				workflowTaskService: {
					reportBuildOutcome,
				},
				plannedTaskService: {
					markSucceeded,
				},
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn: jest.fn() },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(context.workflowService.createFromWorkflowJSON).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Generated workflow' }),
			{ markAsAiTemporary: true },
		);
		expect(resolveCredentials).toHaveBeenCalled();
		expect(stripStaleCredentialsFromWorkflow).toHaveBeenCalled();
		expect(ensureWebhookIds).toHaveBeenCalled();
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		expect(result).toMatchObject({
			success: true,
			workflowId: 'wf-1',
			workItemId: 'wi-1',
			verificationReadiness: { status: 'ready' },
			setupRequirement: { status: 'not_required' },
			triggerNodes: [{ nodeName: 'Webhook', nodeType: 'n8n-nodes-base.webhook' }],
		});
		expect(reportBuildOutcome).toHaveBeenCalledWith(
			expect.objectContaining<Partial<WorkflowBuildOutcome>>({
				workItemId: 'wi-1',
				runId: 'run-1',
				taskId: 'task-1',
				workflowId: 'wf-1',
				submitted: true,
				verificationReadiness: { status: 'ready' },
				setupRequirement: { status: 'not_required' },
			}),
		);
		expect(markSucceeded).toHaveBeenCalledWith('thread-1', 'task-1', expect.any(Object));
		const succeededUpdate = markSucceeded.mock.calls[0]?.[2];
		expect(succeededUpdate?.result).toBe('Created workflow "Generated workflow" (wf-1).');
		expect(succeededUpdate?.outcome).toMatchObject({ workItemId: 'wi-1', workflowId: 'wf-1' });
	});

	it('keeps the build successful when main workflow promotion fails', async () => {
		const warn = jest.fn();
		const context = {
			userId: 'user-1',
			runId: 'run-1',
			workflowService: {
				createFromWorkflowJSON: jest.fn(async () => await Promise.resolve({ id: 'wf-1' })),
				clearAiTemporary: jest.fn(async () => {
					await Promise.resolve();
					throw new Error('temporary marker cleanup failed');
				}),
			},
			credentialService: {},
			nodeService: {},
			dataTableService: {},
			executionService: {},
			workflowBuildContext: {
				threadId: 'thread-1',
				runId: 'run-1',
				taskId: 'task-1',
				workItemId: 'wi-1',
				workflowTaskService: {
					reportBuildOutcome: jest.fn(
						async () => await Promise.resolve({ type: 'verify' as const, workflowId: 'wf-1' }),
					),
				},
				plannedTaskService: {
					markSucceeded: jest.fn(async () => await Promise.resolve(null)),
				},
			},
			permissions: { createWorkflow: 'always_allow' },
			logger: { warn },
		} as unknown as InstanceAiContext;

		const tool = createBuildWorkflowTool(context);
		const result = await executeTool(tool, { code: 'workflow code' });

		expect(result).toMatchObject({ success: true, workflowId: 'wf-1' });
		expect(context.workflowService.clearAiTemporary).toHaveBeenCalledWith('wf-1');
		expect(warn).toHaveBeenCalledWith(
			'Failed to clear AI-builder temporary marker on main workflow wf-1: temporary marker cleanup failed',
		);
	});
});
