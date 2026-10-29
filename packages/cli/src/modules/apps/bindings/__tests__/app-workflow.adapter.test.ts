import type { Logger } from '@n8n/backend-common';
import type { AppCallContext, AppsConfig } from '@n8n/backend-module-apps';
import type { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { WorkflowToolUnavailableError } from '@/modules/agents/tools/workflow-tool-unavailable-error';
import type { WorkflowToolWorkflowLoader } from '@/modules/agents/tools/workflow-tool-workflow-loader.service';
import type { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowRunner } from '@/workflow-runner';

import { AppWorkflowAdapter } from '../app-workflow.adapter';

const ctx: AppCallContext = {
	appId: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	bindingKey: 'submit',
	visitor: { type: 'user', userId: 'user-1' },
};

const nodes = [
	{ name: 'Start', type: 'n8n-nodes-base.executeWorkflowTrigger' },
	{ name: 'Fail', type: 'n8n-nodes-base.stopAndError' },
	{ name: 'Query', type: 'n8n-nodes-base.postgres' },
];

function execution(overrides: {
	status?: string;
	metadata?: Record<string, string>;
	lastNodeExecuted?: string;
	error?: string;
}) {
	return {
		workflowId: 'workflow-1',
		status: overrides.status ?? 'error',
		workflowData: { nodes },
		data: {
			resultData: {
				runData: {},
				lastNodeExecuted: overrides.lastNodeExecuted ?? 'Query',
				error: overrides.error ? { message: overrides.error } : undefined,
				metadata: overrides.metadata ?? {
					appId: 'app-1',
					appBindingKey: 'submit',
					appVisitor: 'user:user-1',
				},
			},
		},
	};
}

function setup() {
	const loader = mock<WorkflowToolWorkflowLoader>();
	const executions = mock<ExecutionPersistence>();
	const runner = mock<WorkflowRunner>();
	const adapter = new AppWorkflowAdapter(
		loader,
		mock<WorkflowFinderService>(),
		mock<SubworkflowPolicyChecker>(),
		runner,
		mock<ActiveExecutions>(),
		mock<WebhookResponseRelay>(),
		executions,
		mock<AppsConfig>({ apiMaxConcurrentRuns: 20, apiRunWaitMs: 60_000 }),
		mock<GlobalConfig>(),
		mock<Logger>(),
	);
	return { adapter, loader, executions, runner };
}

describe('AppWorkflowAdapter', () => {
	describe('getRun', () => {
		it.each([
			['another visitor', { appId: 'app-1', appBindingKey: 'submit', appVisitor: 'user:user-2' }],
			['another binding', { appId: 'app-1', appBindingKey: 'other', appVisitor: 'user:user-1' }],
			['another app', { appId: 'app-2', appBindingKey: 'submit', appVisitor: 'user:user-1' }],
		])('hides a run that %s started', async (_, metadata) => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(execution({ metadata }) as never);

			await expect(adapter.getRun(ctx, 'workflow-1', '12')).rejects.toMatchObject({
				code: 'run_not_found',
			});
		});

		it('rejects an execution ID that is not a number', async () => {
			const { adapter, executions } = setup();

			await expect(adapter.getRun(ctx, 'workflow-1', '../12')).rejects.toMatchObject({
				code: 'run_not_found',
			});
			expect(executions.findSingleExecution).not.toHaveBeenCalled();
		});

		it('reports a run that is still in progress', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(execution({ status: 'running' }) as never);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toEqual({
				executionId: '12',
				status: 'running',
			});
		});

		it('hides the error text of a private node', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(
				execution({ error: 'password authentication failed for user "admin"' }) as never,
			);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toEqual({
				executionId: '12',
				status: 'error',
				output: [],
				error: 'The workflow failed.',
			});
		});

		it('shows the message of a Stop and Error node', async () => {
			const { adapter, executions } = setup();
			executions.findSingleExecution.mockResolvedValue(
				execution({ lastNodeExecuted: 'Fail', error: 'The email is already registered.' }) as never,
			);

			expect(await adapter.getRun(ctx, 'workflow-1', '12')).toMatchObject({
				error: 'The email is already registered.',
			});
		});
	});

	describe('run', () => {
		it('refuses an unpublished workflow', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockRejectedValue(
				new WorkflowToolUnavailableError('not_published', 'Not published'),
			);

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				code: 'workflow_not_published',
			});
		});

		it('refuses a workflow that left the project', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(null);

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				code: 'resource_missing',
			});
			expect(loader.loadWorkflow).toHaveBeenCalledWith(
				'project-1',
				{ workflowId: 'workflow-1', workflowName: '' },
				{ usePublishedVersion: true },
			);
		});

		it('refuses a workflow without a supported trigger', async () => {
			const { adapter, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(
				mock<WorkflowEntity>({ name: 'Flow', nodes: [], connections: {} }),
			);

			await expect(adapter.run(ctx, 'workflow-1', {})).rejects.toMatchObject({
				code: 'workflow_incompatible',
			});
		});

		it('saves execution data even when the workflow settings prune it', async () => {
			const { adapter, loader, runner } = setup();
			loader.loadWorkflow.mockResolvedValue({
				id: 'workflow-1',
				name: 'Flow',
				nodes: [
					{
						name: 'Start',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						typeVersion: 1.1,
						position: [0, 0],
						parameters: { inputSource: 'passthrough' },
					},
				],
				connections: {},
				settings: { saveDataSuccessExecution: 'none', saveDataErrorExecution: 'none' },
			} as unknown as WorkflowEntity);
			runner.run.mockResolvedValue('12');

			await adapter.run(ctx, 'workflow-1', {});

			expect(runner.run.mock.calls[0][0].workflowData.settings).toMatchObject({
				saveDataSuccessExecution: 'all',
				saveDataErrorExecution: 'all',
			});
		});
	});
});
