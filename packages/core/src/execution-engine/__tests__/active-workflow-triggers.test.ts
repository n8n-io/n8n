import type { Logger } from '@n8n/backend-common';
import type {
	INode,
	INodeExecutionData,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	TriggerTime,
	CronExpression,
} from 'n8n-workflow';
import { LoggerProxy, TriggerCloseError, WorkflowActivationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ErrorReporter } from '@/errors/error-reporter';
import type { InstanceSettings } from '@/instance-settings';
import { Tracing } from '@/observability';

import { ActiveWorkflowTriggers } from '../active-workflow-triggers';
import type { IGetExecuteTriggerFunctions } from '../interfaces';
import type { PollContext } from '../node-execution-context';
import { ScheduledTaskManager } from '../scheduled-task-manager';
import type { TriggersAndPollers } from '../triggers-and-pollers';

describe('ActiveWorkflowTriggers', () => {
	const workflowId = 'test-workflow-id';
	const workflow = mock<Workflow>();
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	const mode: WorkflowExecuteMode = 'trigger';
	const activation: WorkflowActivateMode = 'init';
	const tracing = new Tracing();

	const getTriggerFunctions = vi.fn() as IGetExecuteTriggerFunctions;
	const triggerResponse = mock<ITriggerResponse>();

	const pollFunctions = mock<PollContext>();
	const getPollFunctions = vi.fn<(...args: unknown[]) => PollContext>();

	LoggerProxy.init(mock());
	const logger = mock<Logger>();
	const scheduledTaskManager = mock<ScheduledTaskManager>();
	const triggersAndPollers = mock<TriggersAndPollers>();
	const errorReporter = mock<ErrorReporter>();
	const triggerNode = mock<INode>();
	const pollNode = mock<INode>();

	let activeWorkflowTriggers: ActiveWorkflowTriggers;
	let acquireIsolate: Mock;
	let releaseIsolate: Mock;

	// The cron callback registered for scheduled polls is `() => void executeTrigger()` —
	// fire-and-forget. A single `await callback()` returns immediately, so we yield to
	// the event loop via setImmediate to let the full async chain settle.
	const flushPromises = async () => await new Promise<void>((resolve) => setImmediate(resolve));

	beforeEach(() => {
		vi.clearAllMocks();
		scheduledTaskManager.getWorkflowIdsWithCrons.mockReturnValue([]);
		acquireIsolate = vi.fn().mockResolvedValue(undefined);
		releaseIsolate = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error -- assign minimal expression stub for isolate-acquisition tests
		workflow.expression = { acquireIsolate, releaseIsolate };
		activeWorkflowTriggers = new ActiveWorkflowTriggers(
			logger,
			scheduledTaskManager,
			triggersAndPollers,
			errorReporter,
			tracing,
		);
	});

	type PollTimes = { item: TriggerTime[] };
	type TestOptions = {
		triggerNodes?: INode[];
		pollNodes?: INode[];
		triggerError?: Error;
		pollError?: Error;
		pollTimes?: PollTimes;
	};

	const addWorkflow = async ({
		triggerNodes = [],
		pollNodes = [],
		triggerError,
		pollError,
		pollTimes = { item: [{ mode: 'everyMinute' }] },
	}: TestOptions) => {
		workflow.getTriggerNodes.mockReturnValue(triggerNodes);
		workflow.getPollNodes.mockReturnValue(pollNodes);
		pollFunctions.getNodeParameter.calledWith('pollTimes').mockReturnValue(pollTimes);

		if (triggerError) {
			triggersAndPollers.runTriggerFunction.mockRejectedValueOnce(triggerError);
		} else {
			triggersAndPollers.runTriggerFunction.mockResolvedValue(triggerResponse);
		}

		if (pollError) {
			triggersAndPollers.runPollFunction.mockRejectedValueOnce(pollError);
		} else {
			getPollFunctions.mockReturnValue(pollFunctions);
		}

		return await activeWorkflowTriggers.addAllTriggers(
			workflowId,
			workflow,
			additionalData,
			mode,
			activation,
			getTriggerFunctions,
			getPollFunctions,
		);
	};

	describe('addAllTriggers()', () => {
		describe('should activate workflow', () => {
			it('with trigger function nodes', async () => {
				await addWorkflow({ triggerNodes: [triggerNode] });

				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
				expect(workflow.getTriggerNodes).toHaveBeenCalled();
				expect(triggersAndPollers.runTriggerFunction).toHaveBeenCalledWith(
					workflow,
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
			});

			it('with poll trigger nodes', async () => {
				await addWorkflow({ pollNodes: [pollNode] });

				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
				expect(workflow.getPollNodes).toHaveBeenCalled();
				expect(scheduledTaskManager.registerCron).toHaveBeenCalled();
			});

			it('with both trigger function and poll trigger nodes', async () => {
				await addWorkflow({ triggerNodes: [triggerNode], pollNodes: [pollNode] });

				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
				expect(workflow.getTriggerNodes).toHaveBeenCalled();
				expect(workflow.getPollNodes).toHaveBeenCalled();
				expect(triggersAndPollers.runTriggerFunction).toHaveBeenCalledWith(
					workflow,
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
				expect(scheduledTaskManager.registerCron).toHaveBeenCalled();
				expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
					workflow,
					pollNode,
					pollFunctions,
				);
			});
		});

		describe('should throw error', () => {
			it('if trigger activation fails', async () => {
				const error = new Error('Trigger activation failed');
				await expect(
					addWorkflow({ triggerNodes: [triggerNode], triggerError: error }),
				).rejects.toThrow(WorkflowActivationError);
				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
			});

			it('if poll trigger activation fails', async () => {
				const error = new Error('Failed to activate poll trigger');
				await expect(addWorkflow({ pollNodes: [pollNode], pollError: error })).rejects.toThrow(
					WorkflowActivationError,
				);
				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
			});

			it('if the polling interval is too short', async () => {
				const pollTimes: PollTimes = {
					item: [
						{
							mode: 'custom',
							// 6-field expression with wildcard seconds = runs every second
							cronExpression: '* * * * * *' as CronExpression,
						},
					],
				};

				await expect(addWorkflow({ pollNodes: [pollNode], pollTimes })).rejects.toThrow(
					'The polling interval is too short. It has to be at least a minute.',
				);

				expect(scheduledTaskManager.registerCron).not.toHaveBeenCalled();
			});

			it('should not throw for a 5-field cron expression with step values in minutes field', async () => {
				// Regression test: */15 9-17 * * * means "every 15 minutes between 9am-5pm"
				// This was incorrectly rejected because the check treated the minutes field as seconds
				const pollTimes: PollTimes = {
					item: [
						{
							mode: 'custom',
							cronExpression: '*/15 9-17 * * *' as CronExpression,
						},
					],
				};

				await expect(addWorkflow({ pollNodes: [pollNode], pollTimes })).resolves.toBeUndefined();

				expect(scheduledTaskManager.registerCron).toHaveBeenCalled();
			});
		});

		describe('should roll back partial activation on failure', () => {
			it('closes already-registered trigger responses when a later trigger node fails', async () => {
				const firstResponse = mock<ITriggerResponse>();
				workflow.getTriggerNodes.mockReturnValue([triggerNode, mock<INode>()]);
				workflow.getPollNodes.mockReturnValue([]);
				triggersAndPollers.runTriggerFunction
					.mockResolvedValueOnce(firstResponse)
					.mockRejectedValueOnce(new Error('Trigger activation failed'));

				await expect(
					activeWorkflowTriggers.addAllTriggers(
						workflowId,
						workflow,
						additionalData,
						mode,
						activation,
						getTriggerFunctions,
						getPollFunctions,
					),
				).rejects.toThrow(WorkflowActivationError);

				expect(firstResponse.closeFunction).toHaveBeenCalled();
				expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith(workflowId);
				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
			});

			it('closes already-registered trigger responses when a poll node fails', async () => {
				const responseWithClose = mock<ITriggerResponse>();
				workflow.getTriggerNodes.mockReturnValue([triggerNode]);
				workflow.getPollNodes.mockReturnValue([pollNode]);
				triggersAndPollers.runTriggerFunction.mockResolvedValue(responseWithClose);
				getPollFunctions.mockReturnValue(pollFunctions);
				pollFunctions.getNodeParameter
					.calledWith('pollTimes')
					.mockReturnValue({ item: [{ mode: 'everyMinute' }] });
				triggersAndPollers.runPollFunction.mockRejectedValueOnce(
					new Error('Failed to activate poll trigger'),
				);

				await expect(
					activeWorkflowTriggers.addAllTriggers(
						workflowId,
						workflow,
						additionalData,
						mode,
						activation,
						getTriggerFunctions,
						getPollFunctions,
					),
				).rejects.toThrow(WorkflowActivationError);

				expect(responseWithClose.closeFunction).toHaveBeenCalled();
				expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
			});

			it('continues cleanup and still surfaces the activation error when a close function throws', async () => {
				const closeError = new Error('close failed');
				const failingResponse = mock<ITriggerResponse>();
				(failingResponse.closeFunction as Mock).mockRejectedValueOnce(closeError);
				workflow.getTriggerNodes.mockReturnValue([triggerNode, mock<INode>()]);
				workflow.getPollNodes.mockReturnValue([]);
				triggersAndPollers.runTriggerFunction
					.mockResolvedValueOnce(failingResponse)
					.mockRejectedValueOnce(new Error('Trigger activation failed'));

				await expect(
					activeWorkflowTriggers.addAllTriggers(
						workflowId,
						workflow,
						additionalData,
						mode,
						activation,
						getTriggerFunctions,
						getPollFunctions,
					),
				).rejects.toThrow(WorkflowActivationError);

				expect(failingResponse.closeFunction).toHaveBeenCalled();
				// The close failure is reported with the workflow id, while cron
				// deregistration still runs.
				const [reportedError, meta] = (errorReporter.error as Mock).mock.calls[0];
				expect(reportedError).toBeInstanceOf(Error);
				expect((reportedError as Error).message).toContain(closeError.message);
				expect(meta).toEqual({ extra: { workflowId } });
				expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith(workflowId);
			});
		});

		describe('should acquire expression isolate around scheduled polls', () => {
			// Regression test for CAT-3147: scheduled cron-driven polls run outside
			// the activation acquire/release window, so the expression bridge fails
			// with "No bridge acquired for this context" on every tick.
			it('should acquire and release the isolate when the scheduled poll fires', async () => {
				triggersAndPollers.runPollFunction.mockResolvedValueOnce(null); // initial activation test poll
				triggersAndPollers.runPollFunction.mockResolvedValueOnce(null); // scheduled poll

				await addWorkflow({ pollNodes: [pollNode] });

				acquireIsolate.mockClear();
				releaseIsolate.mockClear();
				triggersAndPollers.runPollFunction.mockClear();

				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeScheduledPoll = registerCronCall[1] as () => Promise<void>;

				await executeScheduledPoll();
				await flushPromises();

				expect(acquireIsolate).toHaveBeenCalledTimes(1);
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
				expect(triggersAndPollers.runPollFunction).toHaveBeenCalledTimes(1);

				const [acquireOrder] = acquireIsolate.mock.invocationCallOrder;
				const [runPollOrder] = triggersAndPollers.runPollFunction.mock.invocationCallOrder;
				const [releaseOrder] = releaseIsolate.mock.invocationCallOrder;

				expect(acquireOrder).toBeLessThan(runPollOrder);
				expect(runPollOrder).toBeLessThan(releaseOrder);
			});

			it('should not acquire the isolate during the initial activation test poll', async () => {
				// The outer ActiveWorkflowManager.add() acquire covers the test poll
				// and the subsequent countTriggers call. Nested acquire/release would
				// release the outer's bridge early and break countTriggers.
				triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);

				await addWorkflow({ pollNodes: [pollNode] });

				expect(triggersAndPollers.runPollFunction).toHaveBeenCalledTimes(1);
				expect(acquireIsolate).not.toHaveBeenCalled();
				expect(releaseIsolate).not.toHaveBeenCalled();
			});

			it('should release the isolate when __emit throws after a successful poll', async () => {
				const pollData = [[{ json: { foo: 'bar' } }]];
				triggersAndPollers.runPollFunction.mockResolvedValueOnce(null); // initial activation test poll
				triggersAndPollers.runPollFunction.mockResolvedValueOnce(pollData); // scheduled poll returns data

				const emitError = new Error('emit failed');
				pollFunctions.__emit.mockImplementationOnce(() => {
					throw emitError;
				});

				await addWorkflow({ pollNodes: [pollNode] });

				acquireIsolate.mockClear();
				releaseIsolate.mockClear();

				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeScheduledPoll = registerCronCall[1] as () => Promise<void>;

				await executeScheduledPoll();
				await flushPromises();

				expect(acquireIsolate).toHaveBeenCalledTimes(1);
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
				expect(pollFunctions.__emitError).toHaveBeenCalledWith(emitError);
			});

			it('should route a failed acquireIsolate on a scheduled poll through __emitError', async () => {
				// Without this routing, the rejection would escape the cron callback
				// `() => void executeTrigger()` and become an unhandled rejection — the
				// user would only see a process-level log line, not an error execution.
				triggersAndPollers.runPollFunction.mockResolvedValueOnce(null); // initial activation test poll

				await addWorkflow({ pollNodes: [pollNode] });

				const acquireError = new Error('Failed to acquire isolate');
				acquireIsolate.mockClear();
				releaseIsolate.mockClear();
				acquireIsolate.mockRejectedValueOnce(acquireError);
				triggersAndPollers.runPollFunction.mockClear();

				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeScheduledPoll = registerCronCall[1] as () => Promise<void>;

				await executeScheduledPoll();
				await flushPromises();

				expect(acquireIsolate).toHaveBeenCalledTimes(1);
				expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).toHaveBeenCalledWith(acquireError);
			});

			it('should release the isolate even when the scheduled poll throws', async () => {
				const error = new Error('Poll function failed');
				triggersAndPollers.runPollFunction
					.mockResolvedValueOnce(null) // initial activation test poll
					.mockRejectedValueOnce(error); // scheduled poll fails

				await addWorkflow({ pollNodes: [pollNode] });

				acquireIsolate.mockClear();
				releaseIsolate.mockClear();

				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeScheduledPoll = registerCronCall[1] as () => Promise<void>;

				await executeScheduledPoll();
				await flushPromises();

				expect(acquireIsolate).toHaveBeenCalledTimes(1);
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
				expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			});
		});

		describe('should handle polling errors', () => {
			it('should throw error when poll fails during initial testing', async () => {
				const error = new Error('Poll function failed');

				await expect(addWorkflow({ pollNodes: [pollNode], pollError: error })).rejects.toThrow(
					WorkflowActivationError,
				);

				expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
					workflow,
					pollNode,
					pollFunctions,
				);
				expect(pollFunctions.__emit).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			});

			it('should emit error when poll fails during regular polling', async () => {
				const error = new Error('Poll function failed');
				triggersAndPollers.runPollFunction
					.mockResolvedValueOnce(null) // Succeed on first call (testing)
					.mockRejectedValueOnce(error); // Fail on second call (regular polling)

				await addWorkflow({ pollNodes: [pollNode] });

				// Get the executeTrigger function that was registered
				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeTrigger = registerCronCall[1] as () => Promise<void>;

				// Execute the trigger function to simulate a regular poll
				await executeTrigger();
				await flushPromises();

				expect(triggersAndPollers.runPollFunction).toHaveBeenCalledTimes(2);
				expect(pollFunctions.__emit).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			});
		});
	});

	describe('in-flight poll during workflow activation', () => {
		// If a poll() is already in flight when the workflow is removed/reactivated,
		// stopping the cron does not abort it; it still resolves later calling `__emit`,
		// triggering an execution against the superseded workflow version.

		it('should not emit from a poll that was already in flight when the workflow was removed', async () => {
			let resolveInFlightPoll!: (value: INodeExecutionData[][] | null) => void;

			triggersAndPollers.runPollFunction
				.mockResolvedValueOnce(null) // initial activation test poll
				.mockReturnValueOnce(
					new Promise<INodeExecutionData[][] | null>((resolve) => {
						resolveInFlightPoll = resolve;
					}),
				); // scheduled poll that hangs in flight

			await addWorkflow({ pollNodes: [pollNode] });

			const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
			const executeScheduledPoll = registerCronCall[1] as () => void;

			// A cron tick fires and the poll() begins awaiting (e.g. a Gmail API call).
			executeScheduledPoll();
			await flushPromises();

			// While the poll is still in flight, the workflow is deactivated/reactivated.
			await activeWorkflowTriggers.remove(workflowId);

			// The in-flight poll now returns data
			resolveInFlightPoll([[{ json: {} }]]);
			await flushPromises();

			// The superseded registration must not trigger an execution.
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();

			// The dropped poll still releases the isolate it acquired.
			expect(acquireIsolate).toHaveBeenCalledTimes(1);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('should not emit an error from a poll that was already in flight when the workflow was removed', async () => {
			let rejectInFlightPoll!: (error: Error) => void;

			triggersAndPollers.runPollFunction
				.mockResolvedValueOnce(null) // initial activation test poll
				.mockReturnValueOnce(
					new Promise<INodeExecutionData[][] | null>((_resolve, reject) => {
						rejectInFlightPoll = reject;
					}),
				); // scheduled poll that hangs in flight

			await addWorkflow({ pollNodes: [pollNode] });
			const executeScheduledPoll = scheduledTaskManager.registerCron.mock.calls[0][1] as () => void;

			executeScheduledPoll();
			await flushPromises();

			// While the poll is still in flight, deactivate the workflow
			await activeWorkflowTriggers.remove(workflowId);

			// The in-flight poll now fails
			rejectInFlightPoll(new Error('poll failed'));
			await flushPromises();

			// The superseded registration must not create an error execution
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('should skip the poll entirely when the workflow is removed before running the poller', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null); // initial activation test poll

			await addWorkflow({ pollNodes: [pollNode] });
			const executeScheduledPoll = scheduledTaskManager.registerCron.mock.calls[0][1] as () => void;

			// Workflow is removed before the cron ticks
			await activeWorkflowTriggers.remove(workflowId);
			triggersAndPollers.runPollFunction.mockClear();

			executeScheduledPoll();
			await flushPromises();

			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(acquireIsolate).not.toHaveBeenCalled();
		});

		it('drops a stale in-flight poll but keeps emitting from the reactivated workflow', async () => {
			// Deactivate then reactivate while a poll is in flight.
			// Dropping the stale poll loses no events: its cursor advance is never
			// persisted (persistence happens only inside `__emit`), so the reactivated
			// registration re-fetches the same events — proven against the real
			// `__emit`/`saveStaticData` chain in active-workflow-manager.test.ts
			// ("does not persist the state of an in-flight poll dropped by workflow removal").
			let resolveStalePoll!: (value: INodeExecutionData[][] | null) => void;

			triggersAndPollers.runPollFunction
				.mockResolvedValueOnce(null) // v1 activation test poll
				.mockReturnValueOnce(
					new Promise<INodeExecutionData[][] | null>((resolve) => {
						resolveStalePoll = resolve;
					}),
				); // v1 scheduled poll: hangs in flight

			await addWorkflow({ pollNodes: [pollNode] });
			const executeStalePoll = scheduledTaskManager.registerCron.mock.calls[0][1] as () => void;

			executeStalePoll();
			await flushPromises();

			// Deactivate, then reactivate while v1 poll is in flight.
			await activeWorkflowTriggers.remove(workflowId);
			triggersAndPollers.runPollFunction
				.mockResolvedValueOnce(null) // v2 activation test poll
				.mockResolvedValueOnce([[{ json: { fresh: true } }]]); // v2 scheduled poll

			await addWorkflow({ pollNodes: [pollNode] });
			const executeFreshPoll = scheduledTaskManager.registerCron.mock.calls[1][1] as () => void;

			// The superseded v1 poll resolves now; it must be dropped.
			resolveStalePoll([[{ json: { stale: true } }]]);
			await flushPromises();
			expect(pollFunctions.__emit).not.toHaveBeenCalled();

			// The reactivated v2 poll still emits normally
			executeFreshPoll();
			await flushPromises();
			expect(pollFunctions.__emit).toHaveBeenCalledTimes(1);
			expect(pollFunctions.__emit).toHaveBeenCalledWith([[{ json: { fresh: true } }]]);
		});
	});

	describe('remove()', () => {
		const setupForRemoval = async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });
			return await activeWorkflowTriggers.remove(workflowId);
		};

		it('should remove an active workflow', async () => {
			const result = await setupForRemoval();

			expect(result).toBe(true);
			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
			expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith(workflowId);
			expect(triggerResponse.closeFunction).toHaveBeenCalled();
		});

		it('should return false when removing non-existent workflow', async () => {
			const result = await activeWorkflowTriggers.remove('non-existent');

			expect(result).toBe(false);
			// Crons are deregistered unconditionally, even for a workflow
			// not tracked as active; such a cron can always be stopped.
			expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith('non-existent');
		});

		it('should not warn when removing a workflow not active in memory', async () => {
			// `remove` is routinely called for workflows not tracked as active (e.g.
			// webhook-only workflows), so that case must not emit a warning.
			await activeWorkflowTriggers.remove('not-active-in-memory');

			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should handle TriggerCloseError when closing trigger', async () => {
			const triggerCloseError = new TriggerCloseError(triggerNode, { level: 'warning' });
			(triggerResponse.closeFunction as Mock).mockRejectedValueOnce(triggerCloseError);

			const result = await setupForRemoval();

			expect(result).toBe(true);
			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
			expect(triggerResponse.closeFunction).toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledWith(triggerCloseError, {
				extra: { workflowId },
			});
		});

		it('should throw WorkflowDeactivationError when closeFunction throws regular error', async () => {
			const error = new Error('Close function failed');
			(triggerResponse.closeFunction as Mock).mockRejectedValueOnce(error);

			await addWorkflow({ triggerNodes: [triggerNode] });

			await expect(activeWorkflowTriggers.remove(workflowId)).rejects.toThrow(
				`Failed to deactivate trigger of workflow ID "${workflowId}": "Close function failed"`,
			);

			expect(triggerResponse.closeFunction).toHaveBeenCalled();
			expect(errorReporter.error).not.toHaveBeenCalled();
		});
	});

	describe('get() and isActive()', () => {
		it('should return workflow data for active workflow', async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });

			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
			expect(activeWorkflowTriggers.get(workflowId)).toBeDefined();
		});

		it('should return undefined for non-active workflow', () => {
			expect(activeWorkflowTriggers.isActive('non-existent')).toBe(false);
			expect(activeWorkflowTriggers.get('non-existent')).toBeUndefined();
		});
	});

	describe('getRegisteredTriggerNodeIds()', () => {
		it('unions recorded trigger responses with registered cron node ids', async () => {
			await addWorkflow({ triggerNodes: [mock<INode>({ id: 'trigger-a' })] });
			scheduledTaskManager.getCronNodeIds.mockReturnValue(['poll-a']);

			expect(activeWorkflowTriggers.getRegisteredTriggerNodeIds(workflowId)).toEqual(
				new Set(['poll-a', 'trigger-a']),
			);
		});

		it('returns only cron node ids when the workflow has no recorded triggers', () => {
			scheduledTaskManager.getCronNodeIds.mockReturnValue(['poll-a']);

			expect(activeWorkflowTriggers.getRegisteredTriggerNodeIds('other-wf')).toEqual(
				new Set(['poll-a']),
			);
		});
	});

	describe('allActiveWorkflows()', () => {
		it('should return all active workflow IDs', async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });

			const activeIds = activeWorkflowTriggers.allActiveWorkflows();

			expect(activeIds).toEqual([workflowId]);
		});
	});

	describe('removeAllNonWebhookTriggerWorkflows()', () => {
		it('should remove all active workflows', async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });

			await activeWorkflowTriggers.removeAllNonWebhookTriggerWorkflows();

			expect(activeWorkflowTriggers.allActiveWorkflows()).toEqual([]);
			expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith(workflowId);
		});
	});

	describe('addTriggers()', () => {
		const triggerNodeA = mock<INode>({ id: 'a' });
		const triggerNodeB = mock<INode>({ id: 'b' });

		const addTriggers = async (nodeIds: string[]) =>
			await activeWorkflowTriggers.addTriggers(
				workflowId,
				workflow,
				nodeIds,
				additionalData,
				mode,
				activation,
				getTriggerFunctions,
				getPollFunctions,
			);

		it('registers only the requested trigger nodes', async () => {
			workflow.getTriggerNodes.mockReturnValue([triggerNodeA, triggerNodeB]);
			workflow.getPollNodes.mockReturnValue([]);
			triggersAndPollers.runTriggerFunction.mockResolvedValue(triggerResponse);

			await addTriggers(['a']);

			expect(triggersAndPollers.runTriggerFunction).toHaveBeenCalledTimes(1);
			expect(triggersAndPollers.runTriggerFunction).toHaveBeenCalledWith(
				workflow,
				triggerNodeA,
				getTriggerFunctions,
				additionalData,
				mode,
				activation,
			);
			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
		});

		it('merges newly added triggers into an already-active workflow', async () => {
			workflow.getTriggerNodes.mockReturnValue([triggerNodeA, triggerNodeB]);
			workflow.getPollNodes.mockReturnValue([]);
			triggersAndPollers.runTriggerFunction.mockResolvedValue(triggerResponse);

			await addTriggers(['a']);
			await addTriggers(['b']);

			expect(triggersAndPollers.runTriggerFunction).toHaveBeenCalledTimes(2);

			await activeWorkflowTriggers.removeTriggers(workflowId, new Set(['a', 'b']));
			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
		});
	});

	describe('removeTriggers()', () => {
		const triggerNodeA = mock<INode>({ id: 'a' });
		const triggerNodeB = mock<INode>({ id: 'b' });
		const pollNodeP = mock<INode>({ id: 'p' });
		const responseA = mock<ITriggerResponse>();
		const responseB = mock<ITriggerResponse>();

		const addTriggerNodesAB = async () => {
			workflow.getTriggerNodes.mockReturnValue([triggerNodeA, triggerNodeB]);
			workflow.getPollNodes.mockReturnValue([]);
			triggersAndPollers.runTriggerFunction.mockImplementation(async (_workflow, node) =>
				node.id === 'a' ? responseA : responseB,
			);

			await activeWorkflowTriggers.addTriggers(
				workflowId,
				workflow,
				['a', 'b'],
				additionalData,
				mode,
				activation,
				getTriggerFunctions,
				getPollFunctions,
			);
		};

		it('closes only the targeted trigger and deregisters its cron, leaving others active', async () => {
			await addTriggerNodesAB();

			await activeWorkflowTriggers.removeTriggers(workflowId, new Set(['a']));

			expect(responseA.closeFunction).toHaveBeenCalled();
			expect(responseB.closeFunction).not.toHaveBeenCalled();
			expect(scheduledTaskManager.deregisterCron).toHaveBeenCalledWith(workflowId, 'a');
			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
		});

		it('drops the workflow once its last trigger is removed and no crons remain', async () => {
			await addTriggerNodesAB();
			scheduledTaskManager.hasCrons.mockReturnValue(false);

			await activeWorkflowTriggers.removeTriggers(workflowId, new Set(['a', 'b']));

			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(false);
		});

		it('keeps the workflow active while it still has registered crons', async () => {
			await addTriggerNodesAB();
			scheduledTaskManager.hasCrons.mockReturnValue(true);

			await activeWorkflowTriggers.removeTriggers(workflowId, new Set(['a', 'b']));

			expect(activeWorkflowTriggers.isActive(workflowId)).toBe(true);
		});

		it('deregisters crons for a poll node with no trigger response', async () => {
			workflow.getTriggerNodes.mockReturnValue([]);
			workflow.getPollNodes.mockReturnValue([pollNodeP]);
			getPollFunctions.mockReturnValue(pollFunctions);
			pollFunctions.getNodeParameter
				.calledWith('pollTimes')
				.mockReturnValue({ item: [{ mode: 'everyMinute' }] });
			triggersAndPollers.runPollFunction.mockResolvedValue(null);

			await activeWorkflowTriggers.addTriggers(
				workflowId,
				workflow,
				['p'],
				additionalData,
				mode,
				activation,
				getTriggerFunctions,
				getPollFunctions,
			);

			await activeWorkflowTriggers.removeTriggers(workflowId, new Set(['p']));

			expect(scheduledTaskManager.deregisterCron).toHaveBeenCalledWith(workflowId, 'p');
		});
	});

	describe('ScheduledTaskManager cron cleanup', () => {
		const hourly = '0 * * * *' as CronExpression;
		let realLogger: ReturnType<typeof mock<Logger>>;
		let realScheduledTaskManager: ScheduledTaskManager;
		let activeWorkflowTriggersReal: ActiveWorkflowTriggers;

		const registerStrandedCron = (id: string, nodeId = 'schedule-node') =>
			realScheduledTaskManager.registerCron(
				{ workflowId: id, nodeId, timezone: 'GMT', expression: hourly },
				vi.fn(),
			);

		beforeEach(() => {
			vi.useFakeTimers();
			realLogger = mock<Logger>();
			realScheduledTaskManager = new ScheduledTaskManager(
				mock<InstanceSettings>({ isLeader: true }),
				mock<Logger>({ scoped: vi.fn().mockReturnValue(mock<Logger>()) }),
				mock(),
				mock(),
			);
			activeWorkflowTriggersReal = new ActiveWorkflowTriggers(
				realLogger,
				realScheduledTaskManager,
				triggersAndPollers,
				errorReporter,
				tracing,
			);
		});

		afterEach(() => {
			realScheduledTaskManager.deregisterAllCrons();
			vi.useRealTimers();
		});

		it('should stop a stranded cron on remove even when the workflow is not active in memory', async () => {
			// A cron registered in the ScheduledTaskManager while the workflow is not
			// tracked as active in memory must still be stoppable via remove().
			registerStrandedCron(workflowId);
			expect(realScheduledTaskManager.cronsByWorkflow.has(workflowId)).toBe(true);
			expect(activeWorkflowTriggersReal.isActive(workflowId)).toBe(false);

			const result = await activeWorkflowTriggersReal.remove(workflowId);

			expect(result).toBe(false);
			expect(realScheduledTaskManager.cronsByWorkflow.has(workflowId)).toBe(false);
		});

		it('should warn when it deregisters a cron for a workflow not active in memory', async () => {
			registerStrandedCron(workflowId);

			await activeWorkflowTriggersReal.remove(workflowId);

			// Stopping a cron for a not-active workflow is unexpected, so it's surfaced.
			expect(realLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Deregistered orphaned crons'),
				{ workflowId },
			);
		});

		it('should deregister crons not tracked as active on removeAll', async () => {
			// removeAll must also stop crons whose workflow is no longer tracked as active.
			registerStrandedCron('orphan-workflow');
			expect(activeWorkflowTriggersReal.isActive('orphan-workflow')).toBe(false);
			expect(realScheduledTaskManager.cronsByWorkflow.has('orphan-workflow')).toBe(true);

			await activeWorkflowTriggersReal.removeAllNonWebhookTriggerWorkflows();

			expect(realScheduledTaskManager.cronsByWorkflow.has('orphan-workflow')).toBe(false);
		});

		it('should leave no registered cron when a later trigger node fails activation', async () => {
			// First trigger registers a cron, second throws → activation fails and the
			// already-registered cron must not be left behind.
			workflow.getTriggerNodes.mockReturnValue([mock<INode>(), mock<INode>()]);
			workflow.getPollNodes.mockReturnValue([]);
			triggersAndPollers.runTriggerFunction
				.mockImplementationOnce(async () => {
					realScheduledTaskManager.registerCron(
						{ workflowId, nodeId: 'trigger-node', timezone: 'GMT', expression: hourly },
						vi.fn(),
					);
					return triggerResponse;
				})
				.mockRejectedValueOnce(new Error('Trigger activation failed'));

			await expect(
				activeWorkflowTriggersReal.addAllTriggers(
					workflowId,
					workflow,
					additionalData,
					mode,
					activation,
					getTriggerFunctions,
					getPollFunctions,
				),
			).rejects.toThrow(WorkflowActivationError);

			expect(realScheduledTaskManager.cronsByWorkflow.has(workflowId)).toBe(false);
		});

		it('should leave no registered cron when a later poll node fails activation', async () => {
			// First poll node registers its cron, second fails its test poll → the
			// registered cron must be torn down. The cron is keyed by workflow.id, so it
			// must match the id passed to addAllTriggers().
			workflow.id = workflowId;
			workflow.getTriggerNodes.mockReturnValue([]);
			workflow.getPollNodes.mockReturnValue([mock<INode>(), mock<INode>()]);
			getPollFunctions.mockReturnValue(pollFunctions);
			pollFunctions.getNodeParameter
				.calledWith('pollTimes')
				.mockReturnValue({ item: [{ mode: 'everyMinute' }] });
			triggersAndPollers.runPollFunction
				.mockResolvedValueOnce(null)
				.mockRejectedValueOnce(new Error('Failed to activate poll trigger'));

			await expect(
				activeWorkflowTriggersReal.addAllTriggers(
					workflowId,
					workflow,
					additionalData,
					mode,
					activation,
					getTriggerFunctions,
					getPollFunctions,
				),
			).rejects.toThrow(WorkflowActivationError);

			expect(realScheduledTaskManager.cronsByWorkflow.has(workflowId)).toBe(false);
		});

		it('should tear down a lingering cron before re-adding so reactivation does not leave a duplicate', async () => {
			// A cron left over from a previously rolled-back activation
			// must be torn down before the new one registers
			// otherwise both would coexist and fire, duplicating executions.
			registerStrandedCron(workflowId, 'stale-node');
			expect(realScheduledTaskManager.cronsByWorkflow.get(workflowId)?.size).toBe(1);

			workflow.id = workflowId;
			workflow.getTriggerNodes.mockReturnValue([mock<INode>()]);
			workflow.getPollNodes.mockReturnValue([]);
			triggersAndPollers.runTriggerFunction.mockImplementationOnce(async () => {
				realScheduledTaskManager.registerCron(
					{ workflowId, nodeId: 'fresh-node', timezone: 'GMT', expression: hourly },
					vi.fn(),
				);
				return triggerResponse;
			});

			await activeWorkflowTriggersReal.addAllTriggers(
				workflowId,
				workflow,
				additionalData,
				mode,
				activation,
				getTriggerFunctions,
				getPollFunctions,
			);

			// Only the newly registered cron remains; the stale one was removed
			const crons = realScheduledTaskManager.cronsByWorkflow.get(workflowId);
			expect(crons?.size).toBe(1);
			expect(Array.from(crons!.values())[0].ctx.nodeId).toBe('fresh-node');
		});
	});
});
