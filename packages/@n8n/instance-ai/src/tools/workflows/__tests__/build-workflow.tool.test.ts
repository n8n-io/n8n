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
});
