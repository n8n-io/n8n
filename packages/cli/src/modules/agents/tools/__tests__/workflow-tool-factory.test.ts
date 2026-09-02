import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import type { SubworkflowPolicyChecker } from '@/executions/pre-execution-checks';
import { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import type { WorkflowRunner } from '@/workflow-runner';

import { executeWorkflow, type WorkflowToolContext } from '../workflow-tool-factory';

const triggerNode: INode = {
	id: 'trigger-1',
	name: 'Manual Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const workflow = {
	id: 'wf-1',
	name: 'Lookup workflow',
	nodes: [triggerNode],
	connections: {},
} as unknown as WorkflowEntity;

function buildContext(run: ReturnType<typeof vi.fn>, extras: Partial<WorkflowToolContext> = {}) {
	return {
		workflowLoader: {} as never,
		workflowRunner: { run } as unknown as WorkflowRunner,
		subworkflowPolicyChecker: mock<SubworkflowPolicyChecker>(),
		activeExecutions: { has: vi.fn().mockReturnValue(false) } as unknown as ActiveExecutions,
		projectId: 'p1',
		executionMode: 'manual',
		...extras,
	} satisfies WorkflowToolContext;
}

describe('executeWorkflow → execution classification', () => {
	beforeEach(() => {
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);
	});

	afterEach(() => {
		Container.reset();
	});

	it.each([
		['manual', 'test'],
		['integrated', 'production'],
	] as const)(
		'runs %s agent workflow tools as %s executions',
		async (executionMode, publicMode) => {
			const run = vi.fn().mockResolvedValue('exec-1');
			const context = {
				...buildContext(run),
				executionMode,
			} as WorkflowToolContext;

			await executeWorkflow(workflow, triggerNode, 'webhook', { body: { value: 1 } }, context);

			const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
			expect(runData.executionMode).toBe(executionMode);
			expect(
				runData.executionData?.executionData?.nodeExecutionStack[0].data.main[0]?.[0]?.json,
			).toMatchObject({ executionMode: publicMode });
		},
	);

	it('checks the caller policy before starting the workflow', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');
		const subworkflowPolicyChecker = mock<SubworkflowPolicyChecker>();
		subworkflowPolicyChecker.checkForProject.mockRejectedValue(new Error('denied'));
		const context = buildContext(run, { subworkflowPolicyChecker });

		await expect(executeWorkflow(workflow, triggerNode, 'manual', {}, context)).rejects.toThrow(
			'denied',
		);

		expect(subworkflowPolicyChecker.checkForProject).toHaveBeenCalledWith(workflow, 'p1');
		expect(run).not.toHaveBeenCalled();
	});

	it('does not execute saved editor pin data', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');
		const workflowWithPinData = {
			...workflow,
			pinData: { 'Pinned Node': [{ json: { value: 'editor-only' } }] },
		} as WorkflowEntity;

		await executeWorkflow(workflowWithPinData, triggerNode, 'manual', { input: 'live' }, {
			...buildContext(run),
			executionMode: 'integrated',
		} as WorkflowToolContext);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.pinData).toEqual({
			[triggerNode.name]: [{ json: { input: 'live' } }],
		});
		expect(runData.workflowData.pinData).toBeUndefined();
	});

	it('returns complete oversized results from the completed integrated run', async () => {
		const answer = 'x'.repeat(25_000);
		const completedRun = {
			mode: 'integrated',
			status: 'success',
			finished: true,
			startedAt: new Date(),
			stoppedAt: new Date(),
			storedAt: 'db',
			data: createRunExecutionData({
				resultData: {
					runData: {
						Result: [
							{
								data: { main: [[{ json: { answer } }]] },
								executionIndex: 0,
								startTime: 0,
								executionTime: 1,
								source: [],
							},
						],
					},
				},
			}),
		} satisfies IRun;
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi.fn().mockResolvedValue(undefined),
		} as unknown as ExecutionPersistence);
		const run = vi.fn().mockResolvedValue('exec-1');
		const activeExecutions = {
			has: vi.fn().mockReturnValue(true),
			getPostExecutePromise: vi.fn().mockResolvedValue(completedRun),
		} as unknown as ActiveExecutions;

		const result = await executeWorkflow(workflow, triggerNode, 'manual', {}, {
			...buildContext(run),
			activeExecutions,
			executionMode: 'integrated',
		} as WorkflowToolContext);

		expect(result).toEqual({
			executionId: 'exec-1',
			status: 'success',
			data: { Result: [{ answer }] },
		});
	});

	it('reads persisted output for a completed manual run', async () => {
		const completedRun = {
			mode: 'manual',
			status: 'success',
			finished: true,
			startedAt: new Date(),
			stoppedAt: new Date(),
			storedAt: 'db',
			data: createRunExecutionData({ resultData: { runData: {} } }),
		} satisfies IRun;
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi.fn().mockResolvedValue({
				status: 'success',
				data: createRunExecutionData({
					resultData: {
						runData: {
							Result: [
								{
									data: { main: [[{ json: { answer: 42 } }]] },
									executionIndex: 0,
									startTime: 0,
									executionTime: 1,
									source: [],
								},
							],
						},
					},
				}),
			}),
		} as unknown as ExecutionPersistence);
		const run = vi.fn().mockResolvedValue('exec-1');
		const activeExecutions = {
			has: vi.fn().mockReturnValue(true),
			getPostExecutePromise: vi.fn().mockResolvedValue(completedRun),
		} as unknown as ActiveExecutions;

		const result = await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{},
			{
				...buildContext(run),
				activeExecutions,
			},
		);

		expect(result.data).toEqual({ Result: [{ answer: 42 }] });
	});
});

describe('executeWorkflow → eval instrumentation', () => {
	beforeEach(() => {
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);
	});

	afterEach(() => {
		Container.reset();
	});

	it('sets configureAdditionalData on the run data when instrumented', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');
		const instrumentToolAdditionalData = vi.fn();

		await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{ input: 'hello' },
			buildContext(run, { instrumentToolAdditionalData }),
			false,
			'Lookup_workflow',
		);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.configureAdditionalData).toBeDefined();

		const additionalData = {};
		void runData.configureAdditionalData!(additionalData as never);
		expect(instrumentToolAdditionalData).toHaveBeenCalledWith(additionalData, {
			toolName: 'Lookup_workflow',
			toolKind: 'workflow',
		});
	});

	it('leaves the run data untouched when not instrumented', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');

		await executeWorkflow(workflow, triggerNode, 'manual', {}, buildContext(run), false);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.configureAdditionalData).toBeUndefined();
	});

	it('leaves the run data untouched when instrumented but no tool name is bound', async () => {
		const run = vi.fn().mockResolvedValue('exec-1');

		await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{},
			buildContext(run, { instrumentToolAdditionalData: vi.fn() }),
			false,
		);

		const runData = run.mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.configureAdditionalData).toBeUndefined();
	});
});

describe('executeWorkflow → webhook response', () => {
	const relay = mock<WebhookResponseRelay>();

	const runnerResolving = (response: IExecuteResponsePromiseData) =>
		vi.fn(
			(
				_runData: IWorkflowExecutionDataProcess,
				_loadStaticData?: boolean,
				_realtime?: boolean,
				_restartExecutionId?: string,
				responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
			) => {
				responsePromise?.resolve(response);
				return 'exec-1';
			},
		);

	beforeEach(() => {
		Container.set(ExecutionPersistence, {
			findSingleExecution: vi
				.fn()
				.mockResolvedValue({ status: 'success', data: { resultData: { runData: {} } } }),
		} as unknown as ExecutionPersistence);
		Container.set(WebhookResponseRelay, relay);
	});

	afterEach(() => {
		Container.reset();
	});

	it('embeds the restored body rather than the store reference it arrived as', async () => {
		const relayed = {
			body: { binaryData: { id: 'database:abc' } },
			headers: {},
			statusCode: 200,
		} as IExecuteResponsePromiseData;
		const restored = { body: { hello: 'world' }, headers: {}, statusCode: 200 };
		relay.restoreOffloadedBody.mockResolvedValue(restored);

		const result = await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{},
			buildContext(runnerResolving(relayed)),
			false,
		);

		expect(relay.restoreOffloadedBody).toHaveBeenCalledWith(relayed, {
			reclaim: true,
			context: { workflowId: 'wf-1', executionId: 'exec-1' },
		});
		expect(result.data?.response).toEqual(restored);
	});

	const responseBodyOf = async (body: unknown) => {
		const relayed = { body: { binaryData: { id: 'database:abc' } } } as IExecuteResponsePromiseData;
		relay.restoreOffloadedBody.mockResolvedValue({ body, headers: {}, statusCode: 200 });

		const result = await executeWorkflow(
			workflow,
			triggerNode,
			'manual',
			{},
			buildContext(runnerResolving(relayed)),
			false,
		);

		return (result.data?.response as { body: unknown }).body;
	};

	it('returns complete oversized results for serializable webhook bodies', async () => {
		const body = { blob: 'x'.repeat(50_000) };

		expect(await responseBodyOf(body)).toEqual(body);
	});

	// Whatever its size: measuring a Buffer costs 12x the body, so it is never serialized.
	it.each([
		['a large Buffer body', 4 * 1024 * 1024],
		['a small Buffer body', 5],
	])('describes %s by its size instead of serializing it', async (_label, byteLength) => {
		expect(await responseBodyOf(Buffer.alloc(byteLength))).toEqual({
			_truncated: true,
			_byteLength: byteLength,
		});
	});

	// Reachable in regular mode only: a relayed body was serialized once already.
	it('describes a cyclic body it cannot serialize', async () => {
		const body: Record<string, unknown> = { name: 'cycle' };
		body.self = body;

		expect(await responseBodyOf(body)).toEqual({ _truncated: true });
	});
});
