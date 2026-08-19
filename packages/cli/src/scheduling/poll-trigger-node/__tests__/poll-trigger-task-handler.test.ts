/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import type { WorkflowRepository } from '@n8n/db';
import { createDispatchReporter, type ClaimedTask } from '@n8n/scheduler';
import type { ErrorReporter, TriggersAndPollers } from 'n8n-core';
import type { INode, INodeExecutionData, IPollFunctions, IWorkflowBase } from 'n8n-workflow';
import { UnexpectedError, Workflow, WorkflowExpression } from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Mock, MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createNodeTypes } from '@/workflows/triggers/__tests__/trigger-test-utils';
import type { DurablePollerGateService } from '@/workflows/triggers/durable-poller-gate.service';
import type { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

import { isPollTriggerTaskPayload, POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-task';
import { PollTriggerTaskHandler } from '../poll-trigger-task-handler';

describe('PollTriggerTaskHandler', () => {
	const nodeTypes = createNodeTypes();
	const triggerExecutionContextFactory = mock<TriggerExecutionContextFactory>();
	const triggersAndPollers = mock<TriggersAndPollers>();
	const workflowRepository = mock<WorkflowRepository>();
	const errorReporter = mock<ErrorReporter>();

	const scopedLogger = mock<Logger>();
	const rootLogger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	let durablePollersAllowed = true;
	const durablePollerGate = {
		get allowed() {
			return durablePollersAllowed;
		},
	} as DurablePollerGateService;

	const handler = new PollTriggerTaskHandler(
		rootLogger,
		triggerExecutionContextFactory,
		triggersAndPollers,
		workflowRepository,
		errorReporter,
		durablePollerGate,
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

		acquireIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'acquireIsolate')
			.mockResolvedValue(false);
		releaseIsolate = vi
			.spyOn(WorkflowExpression.prototype, 'releaseIsolate')
			.mockResolvedValue(undefined);
	});

	describe('durable-poller gate', () => {
		// A `scheduled_job` row persisted by an earlier boot keeps firing after a
		// later boot closed the gate. Activation has fallen back to in-memory
		// polling by then, so running the task would poll the same node twice per
		// interval. It must be skipped, not thrown: a throw retries to the max
		// attempt count and dead-letters every occurrence.
		test('skips the occurrence without polling when the gate is closed', async () => {
			durablePollersAllowed = false;

			await handler.execute(buildTask(), report);

			expect(triggerExecutionContextFactory.loadPublishedWorkflowData).not.toHaveBeenCalled();
			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(onDispatch).not.toHaveBeenCalled();

			durablePollersAllowed = true;
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
			);
			expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
				workflow,
				triggerNode,
				pollFunctions,
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
