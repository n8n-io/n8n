/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { createDispatchReporter, type ClaimedTask } from '@n8n/scheduler';
import type { TriggersAndPollers } from 'n8n-core';
import type { INode, INodeExecutionData, IPollFunctions, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError, Workflow, WorkflowExpression } from 'n8n-workflow';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createNodeTypes } from '@/workflows/triggers/__tests__/trigger-test-utils';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-task';
import { PollTriggerTaskHandler } from '../poll-trigger-task-handler';

describe('PollTriggerTaskHandler', () => {
	const nodeTypes = createNodeTypes();
	const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();
	const triggersAndPollers = mock<TriggersAndPollers>();

	const scopedLogger = mock<Logger>();
	const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const handler = new PollTriggerTaskHandler(
		rootLogger,
		triggerExecutionContextFactory,
		triggersAndPollers,
	);

	// The executor's dispatch-marker callback; cleared each test by vi.clearAllMocks().
	const onDispatch = vi.fn();
	// The reporter the executor hands to `execute`; `dispatched()` fires the spy above.
	const report = createDispatchReporter(onDispatch);

	const triggerNode: INode = {
		id: 'node-1',
		name: 'Poll Trigger',
		type: 'poll',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		disabled: false,
	};

	// Plain data object, not a mock proxy: the handler reads it as a value and
	// the factory builds a real Workflow from it.
	const buildWorkflowData = (overrides: Partial<IWorkflowBase> = {}): IWorkflowBase =>
		({
			id: 'wf-1',
			name: 'My Polling Workflow',
			active: true,
			isArchived: false,
			createdAt: new Date('2026-07-01T00:00:00.000Z'),
			updatedAt: new Date('2026-07-01T00:00:00.000Z'),
			nodes: [triggerNode],
			connections: {},
			settings: { timezone: 'Europe/Berlin' },
			staticData: {},
			...overrides,
		}) as IWorkflowBase;

	// A real Workflow so the handler's isolate acquire/release runs against a real
	// WorkflowExpression, observable via the prototype spies below.
	const buildWorkflow = (workflowData: IWorkflowBase): Workflow =>
		new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: true,
			nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

	const scheduledFor = new Date('2026-07-06T07:30:00.000Z');

	const buildTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
		id: 'task-1',
		jobId: 7,
		taskType: POLL_TRIGGER_TASK_TYPE,
		payload: { workflowId: 'wf-1', nodeId: 'node-1' },
		scheduledFor,
		runAt: scheduledFor,
		status: 'running',
		attempts: 0,
		maxAttempts: 1,
		leaseEpoch: 1,
		...overrides,
	});

	const pollData: INodeExecutionData[][] = [[{ json: { id: 42 } }]];

	let workflow: Workflow;
	let pollFunctions: ReturnType<typeof mock<IPollFunctions>>;
	let acquireIsolate: MockInstance<WorkflowExpression['acquireIsolate']>;
	let releaseIsolate: MockInstance<WorkflowExpression['releaseIsolate']>;

	beforeEach(() => {
		vi.clearAllMocks();

		const workflowData = buildWorkflowData();
		workflow = buildWorkflow(workflowData);
		pollFunctions = mock<IPollFunctions>();

		triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(workflowData);
		triggerExecutionContextFactory.createPollExecutionContext.mockResolvedValue({
			workflow,
			pollFunctions,
		});

		triggersAndPollers.runPollFunction.mockResolvedValue(pollData);

		// The factory builds the Workflow, so spy the isolate primitives on the
		// prototype to observe acquire/release without a real VM evaluator.
		acquireIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'acquireIsolate')
			.mockResolvedValue(false);
		releaseIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'releaseIsolate')
			.mockResolvedValue(undefined);
	});

	describe('task type', () => {
		test('declares the poll-trigger task type it is bound under', () => {
			expect(handler.taskType).toBe(POLL_TRIGGER_TASK_TYPE);
		});
	});

	describe('handoff', () => {
		test('runs poll() against the poll context the factory assembles for the node', async () => {
			const workflowData = buildWorkflowData();
			workflow = buildWorkflow(workflowData);
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(workflowData);
			triggerExecutionContextFactory.createPollExecutionContext.mockResolvedValue({
				workflow,
				pollFunctions,
			});

			await handler.execute(buildTask(), report);

			expect(triggerExecutionContextFactory.loadPublishedWorkflowData).toHaveBeenCalledWith(
				'wf-1',
				{
					bypassCache: true,
				},
			);
			// The resolved trigger node and the freshly loaded data are handed to the
			// factory, which owns the Workflow/additionalData/poll-context assembly.
			expect(triggerExecutionContextFactory.createPollExecutionContext).toHaveBeenCalledWith(
				workflowData,
				triggerNode,
			);
			expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
				workflow,
				triggerNode,
				pollFunctions,
			);
		});

		test('reads workflow data fresh (non-cached) so the poll cursor is never stale', async () => {
			await handler.execute(buildTask(), report);

			// The poll cursor lives in staticData and mutates every tick, so the handler
			// must read live from the DB, never through the publish-time cache.
			expect(triggerExecutionContextFactory.loadPublishedWorkflowData).toHaveBeenCalledWith(
				'wf-1',
				{
					bypassCache: true,
				},
			);
		});

		test('hands off and reports a dispatch when poll() returns new data', async () => {
			await handler.execute(buildTask(), report);

			expect(pollFunctions.__emit).toHaveBeenCalledWith(pollData);
			expect(onDispatch).toHaveBeenCalledTimes(1);
		});

		test('does not emit and reports no dispatch when poll() returns null', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValue(null);

			await handler.execute(buildTask(), report);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});
	});

	describe('isolate lifecycle', () => {
		test('acquires the isolate before running poll() and releases it after', async () => {
			await handler.execute(buildTask(), report);

			expect(acquireIsolate).toHaveBeenCalledTimes(1);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
			expect(acquireIsolate.mock.invocationCallOrder[0]).toBeLessThan(
				releaseIsolate.mock.invocationCallOrder[0],
			);
		});
		// Release on the null-return and poll()-throws paths runs through the same
		// `finally`; the throws case is asserted by the error-routing test below.
	});

	describe('runtime poll failures', () => {
		test('routes a poll() error to the error workflow without re-polling', async () => {
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockRejectedValue(error);

			// Does not rethrow: rethrowing would let the executor retry and re-poll a
			// still-down source instead of running the error workflow.
			await expect(handler.execute(buildTask(), report)).resolves.toBeDefined();

			// The cursor is not advanced (no __emit, so no saveStaticData); the error is
			// handed off to the error workflow via __emitError.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			// Handled, not retried: the occurrence is reported as dispatched.
			expect(onDispatch).toHaveBeenCalledTimes(1);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});
	});

	describe('failures', () => {
		test('rejects a task whose payload is missing workflowId or nodeId', async () => {
			const task = buildTask({ payload: { nodeId: 'node-1' } });

			await expect(handler.execute(task, report)).rejects.toThrow(UnexpectedError);
			expect(triggerExecutionContextFactory.loadPublishedWorkflowData).not.toHaveBeenCalled();
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
		});

		test('propagates a missing published workflow so the executor records the failure', async () => {
			const error = new UnexpectedError('Published version not found for workflow');
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockRejectedValue(error);

			await expect(handler.execute(buildTask(), report)).rejects.toThrow(error);
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
		});

		test.each([
			['gone from', [] as INode[]],
			['disabled in', [{ ...triggerNode, disabled: true }]],
		])('rejects a task whose trigger node is %s the published workflow', async (_case, nodes) => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({ nodes }),
			);

			await expect(handler.execute(buildTask(), report)).rejects.toThrow(
				'missing or disabled in the published workflow',
			);
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
		});
	});
});
