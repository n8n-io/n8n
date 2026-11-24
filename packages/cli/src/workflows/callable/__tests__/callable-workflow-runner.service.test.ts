import type { WorkflowsConfig } from '@n8n/config';
import type { Project, WorkflowEntity } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IRun, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { SubworkflowPolicyDenialError } from '@/errors/subworkflow-policy-denial.error';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import type { WorkflowRunner } from '@/workflow-runner';

import type { CallableWorkflowLoader } from '../callable-workflow-loader.service';
import { CallableWorkflowRunner } from '../callable-workflow-runner.service';
import { CallableWorkflowUnavailableError } from '../callable-workflow-unavailable.error';

const PROJECT_ID = 'project-1';
const WORKFLOW_ID = 'workflow-1';

const trigger = {
	id: 'trigger',
	name: 'Start',
	type: 'n8n-nodes-base.executeWorkflowTrigger',
	typeVersion: 1.1,
	position: [0, 0],
	parameters: {
		inputSource: 'workflowInputs',
		workflowInputs: {
			values: [
				{ name: 'email', type: 'string' },
				{ name: 'count', type: 'number' },
			],
		},
	},
};
const setNode = {
	id: 'set',
	name: 'Set',
	type: 'n8n-nodes-base.set',
	typeVersion: 3,
	position: [200, 0],
	parameters: {},
};

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}) {
	return {
		id: WORKFLOW_ID,
		name: 'Get pipeline summary',
		description: 'Returns the open deals.',
		nodes: [trigger, setNode],
		connections: { Start: { main: [[{ node: 'Set', type: 'main', index: 0 }]] } },
		settings: {},
		shared: [{ projectId: PROJECT_ID, role: 'workflow:owner' }],
		...overrides,
	} as unknown as WorkflowEntity;
}

const policyDenial = () =>
	new SubworkflowPolicyDenialError({
		subworkflowId: WORKFLOW_ID,
		subworkflowProject: mock<Project>({ type: 'team' }),
		hasReadAccess: false,
		instanceUrl: 'http://localhost:5678',
		callerType: 'agent',
	});

function completedRun(overrides: Partial<IRun> & { error?: string; lastNode?: string } = {}) {
	const { error, lastNode, ...run } = overrides;
	return {
		status: 'success',
		data: {
			resultData: {
				runData: {
					Start: [{ data: { main: [[{ json: { email: 'a@b.c' } }]] } }],
					Set: [{ data: { main: [[{ json: { deals: 3 } }, { json: { deals: 4 } }]] } }],
				},
				lastNodeExecuted: lastNode ?? 'Set',
				...(error ? { error: { message: error } } : {}),
			},
		},
		...run,
	} as unknown as IRun;
}

/** Starts an execution that stays active until the test settles `done`. */
function startExecution(ctx: ReturnType<typeof setup>, executionId = 'exec-1') {
	const done = createDeferredPromise<IRun | undefined>();
	ctx.workflowRunner.run.mockResolvedValueOnce(executionId);
	ctx.activeExecutions.has.mockImplementation((id) => id === executionId);
	ctx.activeExecutions.getPostExecutePromise.mockImplementation(async (id) =>
		id === executionId ? await done.promise : undefined,
	);
	return done;
}

const WAIT = { waitMs: 60_000 };

function setup({ maxRuns = 20 } = {}) {
	const loader = mock<CallableWorkflowLoader>();
	const policyChecker = mock<SubworkflowPolicyChecker>();
	const workflowRunner = mock<WorkflowRunner>();
	const activeExecutions = mock<ActiveExecutions>();
	activeExecutions.has.mockReturnValue(false);
	const executionPersistence = mock<ExecutionPersistence>();
	const runner = new CallableWorkflowRunner(
		loader,
		policyChecker,
		workflowRunner,
		activeExecutions,
		executionPersistence,
		mock<WorkflowsConfig>({ callableMaxConcurrentRuns: maxRuns }),
	);
	return { runner, loader, policyChecker, workflowRunner, activeExecutions, executionPersistence };
}

describe('CallableWorkflowRunner', () => {
	describe('check', () => {
		it('refuses a workflow that is not in the project', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(null);

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_found',
			});
			expect(loader.loadWorkflow).toHaveBeenCalledWith(
				PROJECT_ID,
				{ workflowId: WORKFLOW_ID, workflowName: '' },
				{ usePublishedVersion: true },
			);
		});

		it('refuses a workflow that the project can see but does not own', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(
				makeWorkflow({
					shared: [
						{ projectId: 'project-2', role: 'workflow:owner' },
						{ projectId: PROJECT_ID, role: 'workflow:editor' },
					],
				} as Partial<WorkflowEntity>),
			);

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_found',
			});
		});

		it('refuses a workflow that is not published', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockRejectedValue(
				new CallableWorkflowUnavailableError('not_published', 'not published'),
			);

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_published',
			});
		});

		it('refuses a workflow without the trigger "When Executed by Another Workflow"', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(makeWorkflow({ nodes: [setNode] } as never));

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'no_supported_trigger',
			});
		});

		it('refuses a workflow with a node that cannot run as a tool', async () => {
			const { runner, loader } = setup();
			const form = { ...setNode, name: 'Form', type: 'n8n-nodes-base.form' };
			loader.loadWorkflow.mockResolvedValue(
				makeWorkflow({
					nodes: [trigger, form],
					connections: { Start: { main: [[{ node: 'Form', type: 'main', index: 0 }]] } },
				} as never),
			);

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'incompatible_nodes',
			});
		});

		it('refuses a workflow whose sub-workflow policy does not allow the project', async () => {
			const { runner, loader, policyChecker } = setup();
			const workflow = makeWorkflow();
			loader.loadWorkflow.mockResolvedValue(workflow);
			policyChecker.checkForProject.mockRejectedValue(policyDenial());

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'not_callable',
			});
			expect(policyChecker.checkForProject).toHaveBeenCalledWith(workflow, PROJECT_ID);
		});

		it('accepts a published workflow of the project with the right trigger', async () => {
			const { runner, loader } = setup();
			const workflow = makeWorkflow();
			loader.loadWorkflow.mockResolvedValue(workflow);

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: true,
				workflow,
			});
		});

		it('passes on an unexpected error of the loader', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockRejectedValue(new Error('database down'));

			await expect(runner.check(PROJECT_ID, WORKFLOW_ID)).rejects.toThrow('database down');
		});
	});

	describe('describe', () => {
		it('describes the name, the description, and the inputs of the published version', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(makeWorkflow());

			await expect(runner.describe(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: true,
				name: 'Get pipeline summary',
				description: 'Returns the open deals.',
				inputSchema: {
					type: 'object',
					properties: {
						email: { type: ['string', 'null'], description: 'email' },
						count: { type: ['number', 'null'], description: 'count' },
					},
					additionalProperties: false,
				},
			});
		});

		it('describes a workflow that accepts all data as an open object', async () => {
			const { runner, loader } = setup();
			const passthrough = { ...trigger, parameters: { inputSource: 'passthrough' } };
			loader.loadWorkflow.mockResolvedValue(
				makeWorkflow({ nodes: [passthrough, setNode] } as never),
			);

			const described = await runner.describe(PROJECT_ID, WORKFLOW_ID);

			expect(described).toMatchObject({
				callable: true,
				inputSchema: { type: 'object', additionalProperties: true },
			});
		});

		it('gives the reason when the workflow cannot be a tool', async () => {
			const { runner, loader } = setup();
			loader.loadWorkflow.mockResolvedValue(makeWorkflow({ nodes: [setNode] } as never));

			await expect(runner.describe(PROJECT_ID, WORKFLOW_ID)).resolves.toEqual({
				callable: false,
				reason: 'no_supported_trigger',
			});
		});
	});

	describe('run', () => {
		it('gives the reason and starts nothing when the workflow cannot be a tool', async () => {
			const ctx = setup();
			ctx.loader.loadWorkflow.mockResolvedValue(null);

			await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).resolves.toEqual({
				status: 'refused',
				reason: 'not_found',
			});
			expect(ctx.workflowRunner.run).not.toHaveBeenCalled();
		});

		it.each([
			['a value of the wrong type', { count: 'many' }],
			['a list', [1, 2]],
		])('refuses %s as input and starts nothing', async (_label, input) => {
			const ctx = setup();
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());

			const result = await ctx.runner.run(PROJECT_ID, WORKFLOW_ID, input, WAIT);

			expect(result).toMatchObject({ status: 'invalid_input', message: expect.any(String) });
			expect(ctx.workflowRunner.run).not.toHaveBeenCalled();
		});

		it('runs the published version as the project and returns the items of the last node', async () => {
			const ctx = setup();
			const workflow = makeWorkflow();
			ctx.loader.loadWorkflow.mockResolvedValue(workflow);
			const done = startExecution(ctx);

			const pending = ctx.runner.run(PROJECT_ID, WORKFLOW_ID, { email: 'a@b.c' }, WAIT);
			done.resolve(completedRun());

			await expect(pending).resolves.toMatchObject({
				status: 'success',
				executionId: 'exec-1',
				output: [{ deals: 3 }, { deals: 4 }],
			});
			const [runData] = ctx.workflowRunner.run.mock.calls[0] as [IWorkflowExecutionDataProcess];
			expect(runData.executionMode).toBe('integrated');
			expect(runData.workflowData.id).toBe(WORKFLOW_ID);
			expect(runData.startNodes).toEqual([{ name: 'Start', sourceData: null }]);
			expect(runData.pinData).toEqual({ Start: [{ json: { email: 'a@b.c' } }] });
		});

		it('returns the error message and the node type of a failed run', async () => {
			const ctx = setup();
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
			const done = startExecution(ctx);

			const pending = ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT);
			done.resolve(completedRun({ status: 'error', error: 'No deals table', lastNode: 'Set' }));

			await expect(pending).resolves.toMatchObject({
				status: 'error',
				executionId: 'exec-1',
				error: { message: 'No deals table', nodeType: 'n8n-nodes-base.set' },
			});
		});

		it('reads the result from the database when the run finished before the wait', async () => {
			const ctx = setup();
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
			ctx.workflowRunner.run.mockResolvedValue('exec-1');
			ctx.executionPersistence.findSingleExecution.mockResolvedValue(completedRun() as never);

			await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).resolves.toMatchObject({
				status: 'success',
				output: [{ deals: 3 }, { deals: 4 }],
			});
			expect(ctx.executionPersistence.findSingleExecution).toHaveBeenCalledWith('exec-1', {
				includeData: true,
				unflattenData: true,
			});
		});

		it('returns "running" when the run does not finish in the wait time', async () => {
			vi.useFakeTimers();
			try {
				const ctx = setup();
				ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
				startExecution(ctx);

				const pending = ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, { waitMs: 1_000 });
				await vi.advanceTimersByTimeAsync(1_000);

				await expect(pending).resolves.toMatchObject({ status: 'running', executionId: 'exec-1' });
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('run limit', () => {
		it('returns "busy" and starts nothing when the limit is full', async () => {
			const ctx = setup({ maxRuns: 1 });
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
			startExecution(ctx);

			const first = ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT);
			await vi.waitFor(() => expect(ctx.workflowRunner.run).toHaveBeenCalledTimes(1));

			await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).resolves.toEqual({
				status: 'busy',
			});
			expect(ctx.workflowRunner.run).toHaveBeenCalledTimes(1);
			void first;
		});

		it('keeps the slot after the wait ends, until the execution finishes', async () => {
			vi.useFakeTimers();
			try {
				const ctx = setup({ maxRuns: 1 });
				ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
				const done = startExecution(ctx);

				const first = ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, { waitMs: 1_000 });
				await vi.advanceTimersByTimeAsync(1_000);
				const started = await first;
				expect(started).toMatchObject({ status: 'running' });
				await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).resolves.toEqual({
					status: 'busy',
				});

				done.resolve(completedRun());
				await ('finished' in started && started.finished);
				startExecution(ctx, 'exec-2');
				const second = ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, { waitMs: 1_000 });
				await vi.advanceTimersByTimeAsync(1_000);
				await expect(second).resolves.toMatchObject({ status: 'running', executionId: 'exec-2' });
			} finally {
				vi.useRealTimers();
			}
		});

		it('frees the slot when the run fails to start', async () => {
			const ctx = setup({ maxRuns: 1 });
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
			ctx.workflowRunner.run.mockRejectedValueOnce(new Error('queue down'));

			await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).rejects.toThrow('queue down');

			ctx.workflowRunner.run.mockResolvedValueOnce('exec-2');
			await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).resolves.toMatchObject({
				executionId: 'exec-2',
			});
		});

		it('frees the slot of a run that finished before the wait', async () => {
			const ctx = setup({ maxRuns: 1 });
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
			ctx.workflowRunner.run.mockResolvedValueOnce('exec-1').mockResolvedValueOnce('exec-2');
			ctx.executionPersistence.findSingleExecution.mockResolvedValue(completedRun() as never);

			await ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT);

			await expect(ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT)).resolves.toMatchObject({
				status: 'success',
				executionId: 'exec-2',
			});
		});

		it('has no limit when the limit is 0', async () => {
			const ctx = setup({ maxRuns: 0 });
			ctx.loader.loadWorkflow.mockResolvedValue(makeWorkflow());
			startExecution(ctx, 'exec-1');
			void ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT);
			await vi.waitFor(() => expect(ctx.workflowRunner.run).toHaveBeenCalledTimes(1));
			startExecution(ctx, 'exec-2');

			void ctx.runner.run(PROJECT_ID, WORKFLOW_ID, {}, WAIT);

			await vi.waitFor(() => expect(ctx.workflowRunner.run).toHaveBeenCalledTimes(2));
		});
	});
});
