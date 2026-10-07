/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { PollerFullState, WorkflowRepository } from '@n8n/db';
import {
	createDispatchReporter,
	createScheduler,
	LeaseLostError,
	TaskTimeoutError,
	type ClaimedTask,
	type SchedulerMetrics,
	type SchedulerTaskStore,
} from '@n8n/scheduler';
import type { ErrorReporter, TriggersAndPollers } from 'n8n-core';
import type { INode, INodeExecutionData, IPollFunctions, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError, Workflow, WorkflowExpression } from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Mock, MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createNodeTypes } from '@/workflows/triggers/__tests__/trigger-test-utils';
import type { PollBackoffService } from '@/workflows/triggers/poll-backoff.service';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-task';
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

	const handler = new PollTriggerTaskHandler(
		rootLogger,
		triggerExecutionContextFactory,
		triggersAndPollers,
		workflowRepository,
		errorReporter,
		pollBackoffService,
		eventService,
	);

	const onDispatch = vi.fn();
	const report = createDispatchReporter(onDispatch);
	const leaseSignal = new AbortController().signal;

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
		timeoutSeconds: 45,
		leaseEpoch: 1,
		...overrides,
	});

	// The `performance.now()` time at which the executor aborts the run.
	const DEADLINE = 45_000;

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

		triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(workflowData);
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
			triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({
					nodes: [triggerNode, { ...triggerNode, name: 'Other Poll Trigger' }],
				}),
			);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});

		test('skips the occurrence when the published version has a node without an id', async () => {
			triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({
					nodes: [triggerNode, { ...triggerNode, id: '', name: 'Other Poll Trigger' }],
				}),
			);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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
			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(triggerExecutionContextFactory.createPollExecutionContext).toHaveBeenCalledWith(
				buildWorkflowData(),
				triggerNode,
				{
					fence: { taskId: 'task-1', leaseEpoch: 1 },
					timeoutSeconds: 45,
					deadline: DEADLINE,
				},
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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(triggerExecutionContextFactory.createPollExecutionContext).toHaveBeenCalledWith(
				buildWorkflowData(),
				triggerNode,
				{
					fence: { taskId: 'task-1', leaseEpoch: 1 },
					timeoutSeconds: 45,
					deadline: DEADLINE,
				},
				{ lastItemId: 'prefetched' },
			);
		});

		test('reads workflow data fresh (non-cached) so the poll cursor is never stale', async () => {
			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(triggerExecutionContextFactory.findPublishedWorkflowData).toHaveBeenCalledWith(
				'wf-1',
				{
					bypassCache: true,
				},
			);
		});

		test('hands off and reports a dispatch when poll() returns new data', async () => {
			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(pollFunctions.__emit).toHaveBeenCalledWith(pollData);
			expect(onDispatch).toHaveBeenCalledTimes(1);
		});

		test('does not emit and reports no dispatch when poll() returns null', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValue(null);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			// The isolate is released on this path too, not just the happy path.
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test.each([
			['data', pollData],
			['no data', null],
		])('rejects after lease loss when the poll returns %s', async (_name, pollResult) => {
			const lease = new AbortController();
			const reason = new Error('lease expired');
			triggersAndPollers.runPollFunction.mockImplementation(async () => {
				lease.abort(reason);
				return pollResult;
			});

			await expect(handler.execute(buildTask(), report, lease.signal, DEADLINE)).rejects.toBe(
				reason,
			);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(pollFunctions.__commitCursor).not.toHaveBeenCalled();
			expect(pollBackoffService.recordSuccess).not.toHaveBeenCalled();
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test.each([
			['data', pollData],
			['no data', null],
		])(
			'rejects if the lease is lost during the active-state lookup with %s',
			async (_name, pollResult) => {
				const lease = new AbortController();
				const reason = new Error('lease expired');
				triggersAndPollers.runPollFunction.mockResolvedValue(pollResult);
				workflowRepository.isActive.mockImplementationOnce(async () => {
					lease.abort(reason);
					return true;
				});

				await expect(handler.execute(buildTask(), report, lease.signal, DEADLINE)).rejects.toBe(
					reason,
				);

				expect(pollFunctions.__emit).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).not.toHaveBeenCalled();
				expect(pollFunctions.__commitCursor).not.toHaveBeenCalled();
				expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
				expect(errorReporter.error).not.toHaveBeenCalled();
				expect(onDispatch).not.toHaveBeenCalled();
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
			},
		);

		test('discards the result and reports no dispatch when the workflow was deactivated during poll()', async () => {
			workflowRepository.isActive.mockResolvedValue(false);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});
	});

	describe('isolate lifecycle', () => {
		test('acquires the isolate before running poll() and releases it after', async () => {
			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			await expect(handler.execute(buildTask(), report, leaseSignal, DEADLINE)).rejects.toThrow(
				'isolate unavailable',
			);

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
			await expect(
				handler.execute(buildTask(), report, leaseSignal, DEADLINE),
			).resolves.toBeDefined();

			// The cursor is not advanced (no __emit, so no saveStaticData); the error is
			// handed off to the error workflow via __emitError.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			// Handled, not retried: the occurrence is reported as dispatched.
			expect(onDispatch).toHaveBeenCalledTimes(1);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test('does not route a poll() error to the error workflow when the claim was lost during poll()', async () => {
			const lease = new AbortController();
			const reason = new Error('lease expired');
			triggersAndPollers.runPollFunction.mockImplementation(async () => {
				lease.abort(reason);
				throw new Error('poll source unreachable');
			});

			await expect(handler.execute(buildTask(), report, lease.signal, DEADLINE)).rejects.toBe(
				reason,
			);

			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test('logs a failing cursor commit instead of routing it to the error workflow', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValue(null);
			const commitError = new Error('poller state write failed');
			pollFunctions.__commitCursor.mockRejectedValue(commitError);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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
		test.each([false, true])(
			'propagates lease loss during a cursor commit (write fails: %s)',
			async (fails) => {
				const lease = new AbortController();
				const reason = new Error('lease expired');
				triggersAndPollers.runPollFunction.mockResolvedValue(null);
				pollFunctions.__commitCursor.mockImplementationOnce(async () => {
					lease.abort(reason);
					if (fails) throw new Error('cursor write failed');
				});

				await expect(handler.execute(buildTask(), report, lease.signal, DEADLINE)).rejects.toBe(
					reason,
				);

				expect(pollFunctions.__emitError).not.toHaveBeenCalled();
				expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
				expect(errorReporter.error).not.toHaveBeenCalled();
				expect(onDispatch).not.toHaveBeenCalled();
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
			},
		);

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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(scopeAtCommit).toBe('staging');
		});

		test('emits inside the scope __runPoll opened', async () => {
			let scopeAtEmit: string | undefined;
			pollFunctions.__emit.mockImplementation(() => {
				scopeAtEmit = scope.getStore();
			});

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(scopeAtEmit).toBe('staging');
		});
	});

	describe('poll timeout', () => {
		test('records a poll failure and reports no dispatch when the occurrence reaches its timeout', async () => {
			const run = new AbortController();
			triggersAndPollers.runPollFunction.mockReturnValue(new Promise(() => {}));

			const settled = expect(
				handler.execute(buildTask(), report, run.signal, DEADLINE),
			).resolves.toBe(report.notDispatched());
			await vi.waitFor(() => expect(triggersAndPollers.runPollFunction).toHaveBeenCalled());
			run.abort(new TaskTimeoutError(45));
			await settled;

			// Writes nothing: no cursor advance via __emit, and no error workflow run
			// either, so the next occurrence covers the same poll window.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
			expect(eventService.emit).toHaveBeenCalledWith('poll-tick-timed-out', {
				nodeType: triggerNode.type,
			});
			expect(scopedLogger.warn).toHaveBeenCalledWith(
				'Poll exceeded its timeout and was abandoned',
				expect.objectContaining({ workflowId: 'wf-1', nodeId: 'node-1' }),
			);
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
			const run = new AbortController();
			workflowRepository.isActive.mockResolvedValue(false);
			triggersAndPollers.runPollFunction.mockReturnValue(new Promise(() => {}));

			const settled = expect(
				handler.execute(buildTask(), report, run.signal, DEADLINE),
			).resolves.toBe(report.notDispatched());
			await vi.waitFor(() => expect(triggersAndPollers.runPollFunction).toHaveBeenCalled());
			run.abort(new TaskTimeoutError(45));
			await settled;

			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
		});

		test('abandons a hanging poll as soon as the lease is lost, and records nothing', async () => {
			const run = new AbortController();
			const reason = new LeaseLostError();
			triggersAndPollers.runPollFunction.mockReturnValue(new Promise(() => {}));

			const rejected = expect(
				handler.execute(buildTask(), report, run.signal, DEADLINE),
			).rejects.toBe(reason);
			await vi.waitFor(() => expect(triggersAndPollers.runPollFunction).toHaveBeenCalled());
			run.abort(reason);
			await rejected;

			expect(eventService.emit).not.toHaveBeenCalledWith('poll-tick-timed-out', expect.anything());
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test('discards the data of an abandoned poll that resolves after the timeout', async () => {
			const run = new AbortController();
			let resolvePoll: (data: INodeExecutionData[][]) => void = () => {};
			triggersAndPollers.runPollFunction.mockReturnValue(
				new Promise((resolve) => {
					resolvePoll = resolve;
				}),
			);

			const settled = expect(
				handler.execute(buildTask(), report, run.signal, DEADLINE),
			).resolves.toBe(report.notDispatched());
			await vi.waitFor(() => expect(triggersAndPollers.runPollFunction).toHaveBeenCalled());
			run.abort(new TaskTimeoutError(45));
			await settled;
			resolvePoll(pollData);
			await new Promise((resolve) => setImmediate(resolve));

			// The tick was already abandoned, so the late data is dropped: no hand-off,
			// no cursor advance, no dispatch.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});

		test('discards an abandoned poll that fails after the timeout', async () => {
			const run = new AbortController();
			let rejectPoll: (error: Error) => void = () => {};
			const pollPromise = new Promise<null>((_resolve, reject) => {
				rejectPoll = reject;
			});
			const runPollFunction = vi.fn();
			// A plain stub, because a vi.fn() subscribes to the promise it returns and so
			// would mark the late rejection as handled.
			const plainHandler = new PollTriggerTaskHandler(
				rootLogger,
				triggerExecutionContextFactory,
				mock<TriggersAndPollers>({
					runPollFunction: async () => {
						runPollFunction();
						return await pollPromise;
					},
				}),
				workflowRepository,
				errorReporter,
				pollBackoffService,
				eventService,
			);

			const settled = expect(
				plainHandler.execute(buildTask(), report, run.signal, DEADLINE),
			).resolves.toBe(report.notDispatched());
			await vi.waitFor(() => expect(runPollFunction).toHaveBeenCalled());
			run.abort(new TaskTimeoutError(45));
			await settled;
			rejectPoll(new Error('poll source unreachable'));
			await new Promise((resolve) => setImmediate(resolve));

			// The tick was already abandoned, so the late failure is dropped rather than
			// routed to the error workflow.
			expect(eventService.emit).toHaveBeenCalledWith('poll-tick-timed-out', expect.anything());
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
		});
	});

	describe('lease cancellation through the executor', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test.each([
			{ maxAttempts: 3, ownsClaim: true },
			{ maxAttempts: 1, ownsClaim: true },
			{ maxAttempts: 3, ownsClaim: false },
		])(
			'counts a failed attempt only for a current claim (maxAttempts: $maxAttempts, owned: $ownsClaim)',
			async ({ maxAttempts, ownsClaim }) => {
				const task = buildTask({ maxAttempts, runAt: new Date() });
				const store = mock<SchedulerTaskStore>();
				const metrics = mock<SchedulerMetrics>();
				store.claimDueTasks.mockResolvedValue([task]);
				store.beginDispatch.mockResolvedValue(1);
				store.markDispatched.mockResolvedValue(1);
				store.completeTask.mockResolvedValue(1);
				store.renewLease.mockRejectedValue(new Error('database unavailable'));
				store.rescheduleTask.mockResolvedValue(ownsClaim ? 1 : 0);
				store.failTaskTerminal.mockResolvedValue(ownsClaim ? 1 : 0);
				let finishPoll!: (data: INodeExecutionData[][]) => void;
				triggersAndPollers.runPollFunction.mockReturnValueOnce(
					new Promise((resolve) => {
						finishPoll = resolve;
					}),
				);
				const scheduler = createScheduler({
					hostId: 'test-host',
					taskStore: store,
					materializerTransaction: vi.fn(),
					executor: { leaseSeconds: 15, lookaheadSeconds: 1 },
					metrics,
				});
				scheduler.registerTaskHandler(POLL_TRIGGER_TASK_TYPE, handler);

				await scheduler.execute();
				await vi.advanceTimersByTimeAsync(15_001);
				expect(metrics.recordLeaseRenewal).toHaveBeenCalledWith(POLL_TRIGGER_TASK_TYPE, 'expired');
				finishPoll(pollData);
				await vi.advanceTimersByTimeAsync(0);
				await scheduler.stop();

				expect(store.markDispatched).not.toHaveBeenCalled();
				expect(store.completeTask).not.toHaveBeenCalled();
				expect(store.rescheduleTask).toHaveBeenCalledTimes(maxAttempts > 1 ? 1 : 0);
				expect(store.failTaskTerminal).toHaveBeenCalledTimes(maxAttempts === 1 ? 1 : 0);
				expect(metrics.recordRetry).toHaveBeenCalledTimes(ownsClaim && maxAttempts > 1 ? 1 : 0);
				expect(metrics.recordDeadLettered).toHaveBeenCalledTimes(maxAttempts === 1 ? 1 : 0);
				expect(metrics.recordLeaseLost).toHaveBeenCalledTimes(ownsClaim ? 0 : 1);
				expect(pollFunctions.__emit).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).not.toHaveBeenCalled();
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
			},
		);
	});

	describe('timeout through the executor', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		// A retry would poll the hanging source again, and does not wait for backoff when it is off.
		test('records a poll failure and completes the occurrence without a retry when a poll reaches its timeout', async () => {
			const timeoutSeconds = 30;
			const task = buildTask({ maxAttempts: 3, timeoutSeconds, runAt: new Date() });
			const store = mock<SchedulerTaskStore>();
			const metrics = mock<SchedulerMetrics>();
			store.claimDueTasks.mockResolvedValue([task]);
			store.beginDispatch.mockResolvedValue(1);
			store.renewLease.mockResolvedValue(true);
			store.rescheduleTask.mockResolvedValue(1);
			store.markDispatched.mockResolvedValue(1);
			store.completeTask.mockResolvedValue(1);
			triggersAndPollers.runPollFunction.mockReturnValue(new Promise(() => {}));
			const scheduler = createScheduler({
				hostId: 'test-host',
				taskStore: store,
				materializerTransaction: vi.fn(),
				executor: { leaseSeconds: 60, lookaheadSeconds: 1 },
				metrics,
			});
			scheduler.registerTaskHandler(POLL_TRIGGER_TASK_TYPE, handler);

			await scheduler.execute();
			await vi.advanceTimersByTimeAsync(timeoutSeconds * 1_000 + 1);
			await vi.waitFor(() => expect(store.completeTask).toHaveBeenCalledTimes(1));
			await scheduler.stop();

			expect(metrics.recordTaskTimeout).toHaveBeenCalledExactlyOnceWith(POLL_TRIGGER_TASK_TYPE);
			expect(pollBackoffService.recordFailure).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.objectContaining({ failure: { cause: 'temporarily-unavailable' } }),
				}),
			);
			expect(store.rescheduleTask).not.toHaveBeenCalled();
			expect(store.failTaskTerminal).not.toHaveBeenCalled();
			expect(store.completeTask).toHaveBeenCalledTimes(1);
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
		});
	});

	describe('failures', () => {
		test('rejects a task whose payload is missing workflowId or nodeId', async () => {
			const task = buildTask({ payload: { nodeId: 'node-1' } });

			await expect(handler.execute(task, report, leaseSignal, DEADLINE)).rejects.toThrow(
				'Poll-trigger task payload is missing workflowId or nodeId',
			);
			expect(triggerExecutionContextFactory.findPublishedWorkflowData).not.toHaveBeenCalled();
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
		});

		test('reports no dispatch when the published workflow is gone', async () => {
			triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(null);

			const decision = await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			// The workflow was unpublished after the claim: the occurrence completes as a
			// no-op instead of retrying to dead-letter while the owner retires the job.
			expect(decision).toBe(report.notDispatched());
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(scopedLogger.debug).toHaveBeenCalledWith(
				expect.stringContaining('no published version'),
				expect.objectContaining({ taskId: 'task-1', workflowId: 'wf-1', nodeId: 'node-1' }),
			);
		});

		test.each([
			['gone from', [] as INode[]],
			['disabled in', [{ ...triggerNode, disabled: true }]],
		])('rejects a task whose trigger node is %s the published workflow', async (_case, nodes) => {
			triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(
				buildWorkflowData({ nodes }),
			);

			await expect(handler.execute(buildTask(), report, leaseSignal, DEADLINE)).rejects.toThrow(
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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

		test('rejects if the lease is lost during the success write', async () => {
			const lease = new AbortController();
			const reason = new Error('lease expired');
			pollBackoffService.recordSuccess.mockImplementationOnce(async () => {
				lease.abort(reason);
			});

			await expect(handler.execute(buildTask(), report, lease.signal, DEADLINE)).rejects.toBe(
				reason,
			);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		test.each(['active-state lookup', 'failure write'])(
			'rejects a poll error if the lease is lost during the %s',
			async (abortDuring) => {
				const lease = new AbortController();
				const reason = new Error('lease expired');
				triggersAndPollers.runPollFunction.mockRejectedValueOnce(
					new Error('poll source unreachable'),
				);
				if (abortDuring === 'active-state lookup') {
					workflowRepository.isActive.mockImplementationOnce(async () => {
						lease.abort(reason);
						return true;
					});
				} else {
					pollBackoffService.recordFailure.mockImplementationOnce(async () => {
						lease.abort(reason);
					});
				}

				await expect(handler.execute(buildTask(), report, lease.signal, DEADLINE)).rejects.toBe(
					reason,
				);

				expect(pollBackoffService.recordFailure).toHaveBeenCalledTimes(
					abortDuring === 'failure write' ? 1 : 0,
				);
				expect(pollFunctions.__emitError).not.toHaveBeenCalled();
				expect(onDispatch).not.toHaveBeenCalled();
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
			},
		);

		test('skips the tick while backing off, without loading the workflow or polling', async () => {
			const state: PollerFullState = {
				cursor: {},
				consecutiveErrors: 3,
				backoffUntil: new Date(fixedNow.getTime() + 60_000),
			};
			pollBackoffService.getState.mockResolvedValue(state);
			pollBackoffService.isBackingOff.mockReturnValue(true);

			const decision = await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(decision).toBe(report.notDispatched());
			expect(triggerExecutionContextFactory.findPublishedWorkflowData).not.toHaveBeenCalled();
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();
			expect(pollBackoffService.isBackingOff).toHaveBeenCalledWith(state, fixedNow);
		});

		test('records a failure and no success when poll() throws', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockRejectedValue(error);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(pollBackoffService.recordFailure).toHaveBeenCalledTimes(1);
		});

		test('records no failure when the poll returned and a later step throws', async () => {
			const state: PollerFullState = { cursor: {}, consecutiveErrors: 1, backoffUntil: null };
			pollBackoffService.getState.mockResolvedValue(state);
			const error = new Error('database unavailable');
			workflowRepository.isActive.mockRejectedValue(error);

			const decision = await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			const decision = await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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

			const decision = await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

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
			triggerExecutionContextFactory.findPublishedWorkflowData.mockResolvedValue(null);

			const decision = await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(decision).toBe(report.notDispatched());
			expect(pollBackoffService.recordFailure).not.toHaveBeenCalled();
			expect(pollBackoffService.recordSuccess).not.toHaveBeenCalled();
		});

		test('does not read the failure state when the payload is invalid', async () => {
			const task = buildTask({ payload: { nodeId: 'node-1' } });

			await expect(handler.execute(task, report, leaseSignal, DEADLINE)).rejects.toThrow();

			expect(pollBackoffService.getState).not.toHaveBeenCalled();
		});

		test('still runs the poll when reading the failure state throws', async () => {
			const error = new Error('poller state read failed');
			pollBackoffService.getState.mockRejectedValue(error);

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			expect(triggersAndPollers.runPollFunction).toHaveBeenCalled();
			expect(onDispatch).toHaveBeenCalledTimes(1);
		});

		test('anchors the failure deadline at failure time, not at tick start', async () => {
			const error = new Error('poll source unreachable');
			triggersAndPollers.runPollFunction.mockImplementation(async () => {
				vi.advanceTimersByTime(90_000);
				throw error;
			});

			await handler.execute(buildTask(), report, leaseSignal, DEADLINE);

			const [, isBackingOffNow] = pollBackoffService.isBackingOff.mock.calls[0];
			const { now: recordFailureNow } = pollBackoffService.recordFailure.mock.calls[0][0];
			expect(isBackingOffNow.getTime()).toBe(fixedNow.getTime());
			expect(recordFailureNow.getTime()).toBeGreaterThan(isBackingOffNow.getTime());
		});
	});
});
