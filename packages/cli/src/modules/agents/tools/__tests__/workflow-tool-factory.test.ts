import { GlobalConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { sleep } from '@n8n/utils/sleep';
import type {
	IExecuteResponsePromiseData,
	INode,
	IRun,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createRunExecutionData, WAIT_INDEFINITELY } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { WebhookResponseRelay } from '@/scaling/webhook-response-relay';
import type { WorkflowRunner } from '@/workflow-runner';

import {
	executeWorkflow,
	resolveWorkflowTool,
	type WorkflowToolContext,
} from '../workflow-tool-factory';
import type { WorkflowToolWorkflowLoader } from '../workflow-tool-workflow-loader.service';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

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

describe('workflow tool → Wait-node handoff', () => {
	const waitWorkflow = {
		id: 'wf-1',
		name: 'Approval workflow',
		nodes: [triggerNode],
		connections: {},
	} as unknown as WorkflowEntity;

	const RESUME_URL = 'https://n8n.example.com/webhook-waiting/exec-1?signature=tok-123';

	/** Parked at a Wait node. Carries the signed URL so the leak test has something to catch. */
	const parkedData = (
		waitTill: Date,
		metadata: Record<string, string> = { resumeUrl: RESUME_URL },
	) =>
		createRunExecutionData({
			resultData: {
				runData: {
					Wait: [
						{
							data: { main: [[]] },
							executionIndex: 0,
							startTime: 0,
							executionTime: 1,
							source: [],
							metadata,
						},
					],
				},
				lastNodeExecuted: 'Wait',
			},
			waitTill,
		});

	const parkedRun = (waitTill: Date, metadata?: Record<string, string>): IRun => ({
		mode: 'integrated',
		status: 'waiting',
		finished: false,
		startedAt: new Date(),
		storedAt: 'db',
		waitTill,
		data: parkedData(waitTill, metadata),
	});

	const parkedInDb = (waitTill: Date) => ({ status: 'waiting', data: parkedData(waitTill) });

	const settledInDb = () => ({
		status: 'success',
		data: createRunExecutionData({
			resultData: {
				runData: {
					Result: [
						{
							data: { main: [[{ json: { approved: true } }]] },
							executionIndex: 0,
							startTime: 0,
							executionTime: 1,
							source: [],
						},
					],
				},
			},
		}),
	});

	function setPersistence(...results: unknown[]) {
		const findSingleExecution = vi.fn();
		for (const result of results) findSingleExecution.mockResolvedValueOnce(result);
		// Repeat the last result for any further poll.
		findSingleExecution.mockResolvedValue(results[results.length - 1]);
		Container.set(ExecutionPersistence, {
			findSingleExecution,
		} as unknown as ExecutionPersistence);
		return findSingleExecution;
	}

	async function buildWaitTool(activeExecutions: ActiveExecutions) {
		const workflowLoader = mock<WorkflowToolWorkflowLoader>();
		workflowLoader.loadWorkflow.mockResolvedValue(waitWorkflow);
		const run = vi.fn().mockResolvedValue('exec-1');
		const tool = await resolveWorkflowTool({ type: 'workflow', workflow: 'Approval workflow' }, {
			...buildContext(run, { workflowLoader, activeExecutions }),
			executionMode: 'integrated',
		} as WorkflowToolContext);
		return { tool, run };
	}

	const activeExecutionsParkedAt = (waitTill: Date, metadata?: Record<string, string>) =>
		({
			has: vi.fn().mockReturnValue(true),
			getPostExecutePromise: vi.fn().mockResolvedValue(parkedRun(waitTill, metadata)),
		}) as unknown as ActiveExecutions;

	function makeCtx(overrides: Record<string, unknown> = {}) {
		const suspend = vi.fn().mockResolvedValue(undefined);
		return { ctx: { suspend, ...overrides } as never, suspend };
	}

	const suspendedCard = (suspend: ReturnType<typeof vi.fn>) =>
		suspend.mock.calls[0][0] as {
			title: string;
			components: Array<Record<string, unknown>>;
		};

	beforeEach(() => {
		vi.mocked(sleep).mockClear().mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Container.reset();
	});

	it('parks the agent run when the workflow waits indefinitely', async () => {
		setPersistence(parkedInDb(WAIT_INDEFINITELY));
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(WAIT_INDEFINITELY));
		const { ctx, suspend } = makeCtx();

		await tool.handler?.({}, ctx);

		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend.mock.calls[0][1]).toEqual({ continuation: { executionId: 'exec-1' } });

		const card = suspendedCard(suspend);
		expect(card.title).toBe('Waiting on "Approval workflow"');
		// An indefinite wait has no deadline to report.
		expect(card.components.some((component) => component.type === 'fields')).toBe(false);
	});

	// Delivering that URL to the right recipient is the waiting workflow's job.
	it('never puts the signed resume URL in the card', async () => {
		setPersistence(parkedInDb(WAIT_INDEFINITELY));
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(WAIT_INDEFINITELY));
		const { ctx, suspend } = makeCtx();

		await tool.handler?.({}, ctx);

		expect(JSON.stringify(suspendedCard(suspend))).not.toContain(RESUME_URL);
	});

	// No resumable checkpoint (inline, sub-agent) or a context that throws on suspend.
	it('reports the waiting status instead of parking when the run cannot be resumed', async () => {
		setPersistence(parkedInDb(WAIT_INDEFINITELY));
		const workflowLoader = mock<WorkflowToolWorkflowLoader>();
		workflowLoader.loadWorkflow.mockResolvedValue(waitWorkflow);
		const tool = await resolveWorkflowTool({ type: 'workflow', workflow: 'Approval workflow' }, {
			...buildContext(vi.fn().mockResolvedValue('exec-1'), {
				workflowLoader,
				activeExecutions: activeExecutionsParkedAt(WAIT_INDEFINITELY),
				supportsHitl: false,
			}),
			executionMode: 'integrated',
		} as WorkflowToolContext);
		const { ctx, suspend } = makeCtx();

		const result = await tool.handler?.({}, ctx);

		expect(suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ executionId: 'exec-1', status: 'waiting' });
	});

	it('polls a bounded wait through and returns the final output in the same call', async () => {
		const waitTill = new Date(Date.now() + 30_000);
		const findSingleExecution = setPersistence(settledInDb());
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(waitTill));
		const { ctx, suspend } = makeCtx();

		const result = await tool.handler?.({}, ctx);

		expect(suspend).not.toHaveBeenCalled();
		// One status probe, then one full read for the output.
		expect(findSingleExecution).toHaveBeenCalledTimes(2);
		expect(result).toEqual({
			executionId: 'exec-1',
			status: 'success',
			data: { Result: [{ approved: true }] },
		});
	});

	// A resumed execution passes through `running` before it finishes; stopping there
	// would hand the model a `running` status and no output.
	it('keeps polling through the running status until the workflow finishes', async () => {
		const waitTill = new Date(Date.now() + 30_000);
		const findSingleExecution = setPersistence(
			{ status: 'running', data: parkedData(waitTill) },
			settledInDb(),
		);
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(waitTill));
		const { ctx, suspend } = makeCtx();

		const result = await tool.handler?.({}, ctx);

		expect(suspend).not.toHaveBeenCalled();
		// Two status probes (running, then success) plus the full read for the output.
		expect(findSingleExecution).toHaveBeenCalledTimes(3);
		expect(result).toEqual({
			executionId: 'exec-1',
			status: 'success',
			data: { Result: [{ approved: true }] },
		});
	});

	it('hands off to the user when a bounded wait outlasts the poll budget', async () => {
		const waitTill = new Date(Date.now() + 30_000);
		setPersistence(parkedInDb(waitTill));
		// Advance a virtual clock per sleep so the poll budget is reached without waiting.
		let now = Date.now();
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		vi.mocked(sleep).mockImplementation(async (ms: number) => {
			await Promise.resolve();
			now += ms;
		});
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(waitTill));
		const { ctx, suspend } = makeCtx();

		await tool.handler?.({}, ctx);

		expect(vi.mocked(sleep).mock.calls.length).toBeGreaterThan(1);
		expect(suspend).toHaveBeenCalledTimes(1);
	});

	it('returns the settled output on resume without re-running the workflow', async () => {
		setPersistence(settledInDb());
		const { tool, run } = await buildWaitTool(mock<ActiveExecutions>());
		const { ctx, suspend } = makeCtx({ continuation: { executionId: 'exec-1' } });

		const result = await tool.handler?.({}, ctx);

		expect(run).not.toHaveBeenCalled();
		expect(suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			executionId: 'exec-1',
			status: 'success',
			data: { Result: [{ approved: true }] },
		});
	});

	// The card is read by a person in a chat, so the deadline is spelled out in
	// the instance timezone instead of handing them a machine timestamp.
	it('renders the deadline as a readable local time, not an ISO string', async () => {
		Container.set(GlobalConfig, { generic: { timezone: 'UTC' } } as GlobalConfig);
		const waitTill = new Date('2027-01-15T18:03:00.000Z');
		setPersistence(parkedInDb(waitTill));
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(waitTill));
		const { ctx, suspend } = makeCtx();

		await tool.handler?.({}, ctx);

		expect(
			suspendedCard(suspend).components.find((component) => component.type === 'fields'),
		).toEqual({
			type: 'fields',
			fields: [{ label: 'Continues at', value: '15 Jan 2027, 18:03 UTC' }],
		});
	});

	// A zone the instance cannot resolve would otherwise render "Invalid DateTime".
	it('falls back to UTC when the instance timezone is unusable', async () => {
		Container.set(GlobalConfig, { generic: { timezone: 'Not/AZone' } } as GlobalConfig);
		const waitTill = new Date('2027-01-15T18:03:00.000Z');
		setPersistence(parkedInDb(waitTill));
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(waitTill));
		const { ctx, suspend } = makeCtx();

		await tool.handler?.({}, ctx);

		expect(JSON.stringify(suspendedCard(suspend))).toContain('15 Jan 2027, 18:03 UTC');
	});

	it('offers both a check and a stop-waiting button, tagged as a wait suspension', async () => {
		setPersistence(parkedInDb(WAIT_INDEFINITELY));
		const { tool } = await buildWaitTool(activeExecutionsParkedAt(WAIT_INDEFINITELY));
		const { ctx, suspend } = makeCtx();

		await tool.handler?.({}, ctx);

		const card = suspendedCard(suspend);
		// The marker is what lets the preview chat and the session trace tell a
		// wait apart from a question or an approval.
		expect(card).toMatchObject({ type: 'workflow_wait' });
		expect(card.components.filter((component) => component.type === 'button')).toEqual([
			{ type: 'button', label: 'Check for the result', value: 'continue', style: 'primary' },
			{ type: 'button', label: 'Stop waiting', value: 'cancel', style: 'danger' },
		]);
	});

	it('stops waiting instead of parking again when the user cancels the wait', async () => {
		setPersistence(parkedInDb(WAIT_INDEFINITELY));
		const { tool, run } = await buildWaitTool(mock<ActiveExecutions>());
		const { ctx, suspend } = makeCtx({
			continuation: { executionId: 'exec-1' },
			resumeData: { type: 'button', value: 'cancel' },
		});

		const result = await tool.handler?.({}, ctx);

		expect(run).not.toHaveBeenCalled();
		expect(suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			executionId: 'exec-1',
			status: 'waiting',
			note: expect.stringContaining('stopped waiting'),
		});
	});

	// A bounded wait due within the poll window would otherwise block the
	// cancellation for up to a minute before parking again.
	it('does not poll a due-soon wait when the user cancels it', async () => {
		const waitTill = new Date(Date.now() + 30_000);
		setPersistence(parkedInDb(waitTill));
		const { tool } = await buildWaitTool(mock<ActiveExecutions>());
		const { ctx, suspend } = makeCtx({
			continuation: { executionId: 'exec-1' },
			resumeData: { type: 'button', value: 'cancel' },
		});

		await tool.handler?.({}, ctx);

		expect(vi.mocked(sleep)).not.toHaveBeenCalled();
		expect(suspend).not.toHaveBeenCalled();
	});

	it('parks again when the workflow is still waiting on resume', async () => {
		setPersistence(parkedInDb(WAIT_INDEFINITELY));
		const { tool, run } = await buildWaitTool(mock<ActiveExecutions>());
		const { ctx, suspend } = makeCtx({ continuation: { executionId: 'exec-1' } });

		await tool.handler?.({}, ctx);

		expect(run).not.toHaveBeenCalled();
		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend.mock.calls[0][1]).toEqual({ continuation: { executionId: 'exec-1' } });
	});
});

describe('workflow tool → parentAgentRun stamping', () => {
	const agentCtx = {
		suspend: vi.fn().mockResolvedValue(undefined),
		runId: 'run-1',
		toolCallId: 'call-1',
		persistence: { threadId: 'agent-1:slack:C123', resourceId: 'user-1' },
	};

	async function runToolWith(contextExtras: Partial<WorkflowToolContext>, ctx: object) {
		const workflowLoader = mock<WorkflowToolWorkflowLoader>();
		workflowLoader.loadWorkflow.mockResolvedValue(workflow);
		const run = vi.fn().mockResolvedValue('exec-1');
		const tool = await resolveWorkflowTool({ type: 'workflow', workflow: 'Lookup workflow' }, {
			...buildContext(run, { workflowLoader, ...contextExtras }),
			projectId: 'project-1',
			executionMode: 'integrated',
		} as WorkflowToolContext);
		await tool.handler?.({}, ctx as never);
		return (run.mock.calls[0][0] as IWorkflowExecutionDataProcess).executionData;
	}

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

	it('stamps the agent run onto the sub-execution so a Wait node can resume it', async () => {
		const executionData = await runToolWith(
			{ agentId: 'agent-1', integrationType: 'slack' },
			agentCtx,
		);

		expect(executionData?.parentAgentRun).toEqual({
			agentId: 'agent-1',
			projectId: 'project-1',
			threadId: 'agent-1:slack:C123',
			runId: 'run-1',
			toolCallId: 'call-1',
			integrationType: 'slack',
		});
	});

	it('omits the integration type for a run with no chat platform', async () => {
		const executionData = await runToolWith({ agentId: 'agent-1' }, agentCtx);

		expect(executionData?.parentAgentRun).toEqual(
			expect.objectContaining({ agentId: 'agent-1', threadId: 'agent-1:slack:C123' }),
		);
		expect(executionData?.parentAgentRun).not.toHaveProperty('integrationType');
	});

	// A partial marker would leave the resume path guessing, so it is not written at all.
	it.each([
		['no agentId (inline agent)', {}, agentCtx],
		['no thread', { agentId: 'agent-1' }, { ...agentCtx, persistence: undefined }],
		['no runId', { agentId: 'agent-1' }, { ...agentCtx, runId: undefined }],
		['no toolCallId', { agentId: 'agent-1' }, { ...agentCtx, toolCallId: undefined }],
	])('writes no marker when there is %s', async (_label, contextExtras, ctx) => {
		const executionData = await runToolWith(contextExtras, ctx);

		expect(executionData?.parentAgentRun).toBeUndefined();
	});
});
