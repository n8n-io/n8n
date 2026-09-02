/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { PollerFullState, WorkflowRepository } from '@n8n/db';
import { createDispatchReporter, type ClaimedTask } from '@n8n/scheduler';
import type { ErrorReporter, TriggersAndPollers } from 'n8n-core';
import type { INode, INodeExecutionData, IPollFunctions, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError, Workflow, WorkflowExpression } from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Mock, MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';
import { createNodeTypes } from '@/workflows/triggers/__tests__/trigger-test-utils';
import type { PollBackoffService } from '@/workflows/triggers/poll-backoff.service';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { isPollTriggerTaskPayload, POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-task';
import { PollTriggerTaskHandler } from '../poll-trigger-task-handler';

describe('PollTriggerTaskHandler', () => {
	const nodeTypes = createNodeTypes();
	const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();
	const triggersAndPollers = mock<TriggersAndPollers>();
	const workflowRepository = mock<WorkflowRepository>();
	const errorReporter = mock<ErrorReporter>();
	const pollBackoffService = mock<PollBackoffService>();

	const scopedLogger = mock<Logger>();
	const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const eventService = mock<EventService>();
	const pollTimeoutSeconds = 60;
	const globalConfig = mock<GlobalConfig>({ scheduler: { pollTimeoutSeconds } });

	const handler = new PollTriggerTaskHandler(
		rootLogger,
		triggerExecutionContextFactory,
		triggersAndPollers,
		workflowRepository,
		errorReporter,
		pollBackoffService,
		eventService,
		globalConfig,
	);

	const onDispatch = vi.fn();
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

	type PollFunctionsMock = ReturnType<typeof mock<IPollFunctions>> & {
		__runPoll: Mock<NonNullable<IPollFunctions['__runPoll']>>;
		__commitCursor: Mock<NonNullable<IPollFunctions['__commitCursor']>>;
	};

	let workflow: Workflow;
	let pollFunctions: PollFunctionsMock;
	let acquireIsolate: MockInstance<WorkflowExpression['acquireIsolate']>;
	let releaseIsolate: MockInstance<WorkflowExpression['releaseIsolate']>;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(() => {
		vi.clearAllMocks();

		const workflowData = buildWorkflowData();
		workflow = buildWorkflow(workflowData);
		pollFunctions = mock<IPollFunctions>() as PollFunctionsMock;
		pollFunctions.__runPoll.mockImplementation(async (poll) => await poll());

		triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(workflowData);
		triggerExecutionContextFactory.createPollExecutionContext.mockResolvedValue({
			workflow,
			pollFunctions,
		});

		triggersAndPollers.runPollFunction.mockResolvedValue(pollData);
		workflowRepository.isActive.mockResolvedValue(true);

		pollBackoffService.getState.mockResolvedValue(null);
		pollBackoffService.isBackingOff.mockReturnValue(false);

		acquireIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'acquireIsolate')
			.mockResolvedValue(false);
		releaseIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'releaseIsolate')
			.mockResolvedValue(undefined);
	});

	describe('unhealthy published version', () => {
		// A due task persisted for a version with duplicate or missing node ids can
		// fire before the healer's corrected version replaces the jobs; resolving a
		// duplicated id would poll the wrong node and write shared cursor state.
		test('skips the occurrence when the published version has duplicate node ids', async () => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({
					nodes: [triggerNode, { ...triggerNode, name: 'Other Poll Trigger' }],
				}),
			);

			await handler.execute(buildTask(), report);

			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});

		test('skips the occurrence when the published version has a node without an id', async () => {
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({
					nodes: [triggerNode, { ...triggerNode, id: '', name: 'Other Poll Trigger' }],
				}),
			);

			await handler.execute(buildTask(), report);

			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});
	});

	describe('task type', () => {
		test('declares the poll-trigger task type it is bound under', () => {
			expect(handler.taskType).toBe(POLL_TRIGGER_TASK_TYPE);
		});
	});

	describe('handoff', () => {
		test('runs poll() against the poll context the factory assembles for the node', async () => {
			await handler.execute(buildTask(), report);

			expect(triggerExecutionContextFactory.createPollExecutionContext).toHaveBeenCalledWith(
				buildWorkflowData(),
				triggerNode,
				{ taskId: 'task-1', leaseEpoch: 1 },
				undefined,
			);
			expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
				workflow,
				triggerNode,
				pollFunctions,
			);
		});

		test('threads the cursor from the top-of-tick state read into the poll context', async () => {
			pollBackoffService.getState.mockResolvedValue({
				cursor: { lastItemId: 'prefetched' },
				consecutiveErrors: 0,
				backoffUntil: null,
			});

			await handler.execute(buildTask(), report);

			expect(triggerExecutionContextFactory.createPollExecutionContext).toHaveBeenCalledWith(
				buildWorkflowData(),
				triggerNode,
				{ taskId: 'task-1', leaseEpoch: 1 },
				{ lastItemId: 'prefetched' },
			);
		});

		test('reads workflow data fresh (non-cached) so the poll cursor is never stale', async () => {
			await handler.execute(buildTask(), report);

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
			// The isolate is released on this path too, not just the happy path.
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test('discards the result and reports no dispatch when the workflow was deactivated during poll()', async () => {
			workflowRepository.isActive.mockResolvedValue(false);

			await handler.execute(buildTask(), report);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
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
		test('does not release the isolate when acquiring it throws', async () => {
			// acquireIsolate runs before the try/finally, so a failed acquire leaves
			// nothing to release and propagates out for the executor to retry.
			acquireIsolate.mockRejectedValue(new Error('isolate unavailable'));

			await expect(handler.execute(buildTask(), report)).rejects.toThrow('isolate unavailable');

			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(releaseIsolate).not.toHaveBeenCalled();
		});
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

		test('logs a failing cursor commit instead of routing it to the error workflow', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValue(null);
			const commitError = new Error('poller state write failed');
			pollFunctions.__commitCursor.mockRejectedValue(commitError);

			await handler.execute(buildTask(), report);

			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(scopedLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to commit the poll cursor'),
				expect.objectContaining({ workflowId: 'wf-1', nodeId: 'node-1', error: commitError }),
			);
			expect(errorReporter.error).toHaveBeenCalledWith(
				commitError,
				expect.objectContaining({
					extra: { taskId: 'task-1', jobId: 7, workflowId: 'wf-1', nodeId: 'node-1' },
				}),
			);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});
	});

	describe('cursor commit', () => {
		const cases: Array<
			[string, { poll: INodeExecutionData[][] | null | Error; active: boolean; commits: number }]
		> = [
			[
				'commits on its own for an empty poll of a still-active workflow',
				{ poll: null, active: true, commits: 1 },
			],
			[
				'commits nothing for an empty poll of a workflow deactivated mid-poll',
				{ poll: null, active: false, commits: 0 },
			],
			[
				'leaves the commit to the emit path when the poll returns data',
				{ poll: pollData, active: true, commits: 0 },
			],
			[
				'commits nothing when the poll throws',
				{ poll: new Error('poll source unreachable'), active: true, commits: 0 },
			],
		];

		test.each(cases)('%s', async (_name, { poll, active, commits }) => {
			if (poll instanceof Error) triggersAndPollers.runPollFunction.mockRejectedValue(poll);
			else triggersAndPollers.runPollFunction.mockResolvedValue(poll);
			workflowRepository.isActive.mockResolvedValue(active);

			await handler.execute(buildTask(), report);

			expect(pollFunctions.__commitCursor).toHaveBeenCalledTimes(commits);
		});
	});

	describe('staged cursor scope', () => {
		// Stands in for the factory's staging store: a cursor can only be committed
		// from inside the scope its own poll opened.
		const scope = new AsyncLocalStorage<string>();

		beforeEach(() => {
			pollFunctions.__runPoll.mockImplementation(async (poll) => await scope.run('staging', poll));
		});

		test('commits the cursor inside the scope __runPoll opened', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValue(null);
			let scopeAtCommit: string | undefined;
			pollFunctions.__commitCursor.mockImplementation(async () => {
				scopeAtCommit = scope.getStore();
			});

			await handler.execute(buildTask(), report);

			expect(scopeAtCommit).toBe('staging');
		});

		test('emits inside the scope __runPoll opened', async () => {
			let scopeAtEmit: string | undefined;
			pollFunctions.__emit.mockImplementation(() => {
				scopeAtEmit = scope.getStore();
			});

			await handler.execute(buildTask(), report);

			expect(scopeAtEmit).toBe('staging');
		});
	});

	describe('poll timeout', () => {
		const pollTimeoutMs = pollTimeoutSeconds * 1000;

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('abandons a poll that outlives the timeout and reports no dispatch', async () => {
			triggersAndPollers.runPollFunction.mockReturnValue(new Promise(() => {}));

			const executing = handler.execute(buildTask(), report);
			await vi.advanceTimersByTimeAsync(pollTimeoutMs);

			await expect(executing).resolves.toBeDefined();
			// Writes nothing: no cursor advance via __emit, and no error workflow run
			// either, so the next occurrence covers the same poll window.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('poll-tick-timed-out', {
				nodeType: triggerNode.type,
			});
			// The timeout counts as a transient poll failure, so a source that keeps
			// hanging backs off like any failing source.
			expect(pollBackoffService.recordFailure).toHaveBeenCalledWith(
				expect.objectContaining({
					workflowId: 'wf-1',
					nodeId: 'node-1',
					error: expect.objectContaining({ failure: { cause: 'temporarily-unavailable' } }),
				}),
			);
			expect(pollBackoffService.recordSuccess).not.toHaveBeenCalled();
		});

		test('records no failure for a workflow deactivated during a timed-out poll', async () => {
			workflowRepository.isActive.mockResolvedValue(false);
			triggersAndPollers.runPollFunction.mockReturnValue(new Promise(() => {}));

			const executing = handler.execute(buildTask(), report);
			await vi.advanceTimersByTimeAsync(pollTimeoutMs);
			await executing;

			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
		});

		test('keeps a poll that finishes just inside the timeout', async () => {
			let resolvePoll: (data: INodeExecutionData[][]) => void = () => {};
			triggersAndPollers.runPollFunction.mockReturnValue(
				new Promise((resolve) => {
					resolvePoll = resolve;
				}),
			);

			const executing = handler.execute(buildTask(), report);
			await vi.advanceTimersByTimeAsync(pollTimeoutMs - 1);
			resolvePoll(pollData);
			await executing;

			expect(pollFunctions.__emit).toHaveBeenCalledWith(pollData);
			expect(onDispatch).toHaveBeenCalledTimes(1);
			expect(eventService.emit).not.toHaveBeenCalledWith('poll-tick-timed-out', expect.anything());
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			// The deadline is cleared once the poll wins, so it can't outlive the tick.
			expect(vi.getTimerCount()).toBe(0);
		});

		test('discards the data of an abandoned poll that resolves after the timeout', async () => {
			let resolvePoll: (data: INodeExecutionData[][]) => void = () => {};
			triggersAndPollers.runPollFunction.mockReturnValue(
				new Promise((resolve) => {
					resolvePoll = resolve;
				}),
			);

			const executing = handler.execute(buildTask(), report);
			await vi.advanceTimersByTimeAsync(pollTimeoutMs);
			await executing;
			resolvePoll(pollData);
			await vi.advanceTimersByTimeAsync(0);

			// The tick was already reported as abandoned, so the late data is dropped:
			// no hand-off, no cursor advance, no dispatch.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});

		test('discards an abandoned poll that fails after the timeout', async () => {
			let rejectPoll: (error: Error) => void = () => {};
			triggersAndPollers.runPollFunction.mockReturnValue(
				new Promise((_resolve, reject) => {
					rejectPoll = reject;
				}),
			);

			const executing = handler.execute(buildTask(), report);
			await vi.advanceTimersByTimeAsync(pollTimeoutMs);
			await executing;
			rejectPoll(new Error('poll source unreachable'));
			await vi.advanceTimersByTimeAsync(0);

			// The tick was already reported as abandoned, so the late failure is dropped
			// rather than routed to the error workflow.
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});
	});

	describe('failures', () => {
		test('rejects a task whose payload is missing workflowId or nodeId', async () => {
			const task = buildTask({ payload: { nodeId: 'node-1' } });

			await expect(handler.execute(task, report)).rejects.toThrow(
				'Poll-trigger task payload is missing workflowId or nodeId',
			);
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

	describe('poll functions missing the durable-cursor members', () => {
		test('still runs the poll when __runPoll and __commitCursor are undefined', async () => {
			(pollFunctions as IPollFunctions).__runPoll = undefined;
			(pollFunctions as IPollFunctions).__commitCursor = undefined;
			triggersAndPollers.runPollFunction.mockResolvedValue(null);

			await handler.execute(buildTask(), report);

			expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
				workflow,
				triggerNode,
				pollFunctions,
			);
			expect(scopedLogger.error).not.toHaveBeenCalled();
		});
	});

	describe('backoff', () => {
		const fixedNow = new Date('2026-07-06T07:30:05.000Z');

		beforeEach(() => {
			vi.useFakeTimers({ now: fixedNow, toFake: ['Date'] });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('skips the tick while backing off, without loading the workflow or polling', async () => {
			const state: PollerFullState = {
				cursor: {},
				consecutiveErrors: 3,
				backoffUntil: new Date(fixedNow.getTime() + 60_000),
			};
			pollBackoffService.getState.mockResolvedValue(state);
			pollBackoffService.isBackingOff.mockReturnValue(true);

			const decision = await handler.execute(buildTask(), report);

			expect(decision).toBe(report.notDispatched());
			expect(triggerExecutionContextFactory.loadPublishedWorkflowData).not.toHaveBeenCalled();
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(pollBackoffService.isBackingOff).toHaveBeenCalledWith(state, fixedNow);
		});

		test('records a failure and no success when poll() throws', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockRejectedValue(error);

			await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordFailure).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				error,
				state,
				now: expect.any(Date),
			});
			expect(pollBackoffService.recordSuccess).not.toHaveBeenCalled();
		});

		// A node type that lost its poll method throws before poll() runs. It is not the
		// source failing, but it repeats every tick, so it gets the same backoff.
		test('records a failure when the poll cannot be started at all', async () => {
			triggersAndPollers.runPollFunction.mockRejectedValue(
				new UnexpectedError('Node type does not have a poll function defined'),
			);

			await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordFailure).toHaveBeenCalledTimes(1);
		});

		test('records no failure when the poll returned and a later step throws', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			const error = new Error('database unavailable');
			workflowRepository.isActive.mockRejectedValue(error);

			const decision = await handler.execute(buildTask(), report);

			expect(triggersAndPollers.runPollFunction).toHaveBeenCalled();
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			expect(decision).toBe(report.dispatched());
		});

		test('still clears the failure state when the poll succeeds but committing its cursor fails', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 2, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			triggersAndPollers.runPollFunction.mockResolvedValue(null);
			pollFunctions.__commitCursor.mockRejectedValue(new Error('poller state write failed'));

			await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordSuccess).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				state,
			});
		});

		test.each([
			['a poll returning items', pollData],
			['a poll returning no items', null],
		])('clears the failure state after %s', async (_name, pollResult) => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 2, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			triggersAndPollers.runPollFunction.mockResolvedValue(pollResult);

			await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordSuccess).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				state,
			});
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
		});

		test('clears the failure state even when the workflow was deactivated during the poll', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			workflowRepository.isActive.mockResolvedValue(false);

			await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordSuccess).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				state,
			});
		});

		test('does not record a failure for a workflow deactivated during a failing poll, but still hands off the error', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockRejectedValue(error);
			workflowRepository.isActive.mockResolvedValue(false);

			const decision = await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			expect(decision).toBe(report.dispatched());
		});

		test('records a failure when the active-state read itself fails, rather than let a real failure go unbacked-off', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockRejectedValue(error);
			workflowRepository.isActive.mockRejectedValue(new Error('database unavailable'));

			const decision = await handler.execute(buildTask(), report);

			expect(pollBackoffService.recordFailure).toHaveBeenCalledWith({
				workflowId: 'wf-1',
				nodeId: 'node-1',
				error,
				state,
				now: expect.any(Date),
			});
			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			expect(decision).toBe(report.dispatched());
		});

		test('does not touch the failure counters when the published workflow is missing', async () => {
			const error = new UnexpectedError('Published version not found for workflow');
			triggerExecutionContextFactory.loadPublishedWorkflowData.mockRejectedValue(error);

			await expect(handler.execute(buildTask(), report)).rejects.toThrow(error);

			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(pollBackoffService.recordSuccess).not.toHaveBeenCalled();
		});

		test('does not read the failure state when the payload is invalid', async () => {
			const task = buildTask({ payload: { nodeId: 'node-1' } });

			await expect(handler.execute(task, report)).rejects.toThrow();

			expect(pollBackoffService.getState).not.toHaveBeenCalled();
		});

		test('still runs the poll when reading the failure state throws', async () => {
			const error = new Error('poller state read failed');
			pollBackoffService.getState.mockRejectedValue(error);

			await handler.execute(buildTask(), report);

			expect(triggersAndPollers.runPollFunction).toHaveBeenCalled();
			expect(onDispatch).toHaveBeenCalledTimes(1);
		});

		test('anchors the failure deadline at failure time, not at tick start', async () => {
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockImplementation(async () => {
				vi.advanceTimersByTime(90_000);
				throw error;
			});

			await handler.execute(buildTask(), report);

			const [, isBackingOffNow] = pollBackoffService.isBackingOff.mock.calls[0];
			const { now: recordFailureNow } = pollBackoffService.recordFailure.mock.calls[0][0];
			expect(isBackingOffNow.getTime()).toBe(fixedNow.getTime());
			expect(recordFailureNow.getTime()).toBeGreaterThan(isBackingOffNow.getTime());
		});
	});

	describe('isPollTriggerTaskPayload', () => {
		test('accepts a payload with workflowId and nodeId', () => {
			expect(isPollTriggerTaskPayload({ workflowId: 'wf-1', nodeId: 'node-1' })).toBe(true);
		});

		test.each([
			['empty payload', {}],
			['missing nodeId', { workflowId: 'wf-1' }],
			['missing workflowId', { nodeId: 'node-1' }],
			['empty workflowId', { workflowId: '', nodeId: 'node-1' }],
			['empty nodeId', { workflowId: 'wf-1', nodeId: '' }],
			['non-string ids', { workflowId: 42, nodeId: true }],
		])('rejects %s', (_name, payload) => {
			expect(isPollTriggerTaskPayload(payload)).toBe(false);
		});
	});
});
