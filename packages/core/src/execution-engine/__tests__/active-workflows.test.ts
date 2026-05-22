import type {
	INode,
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
import { Tracing } from '@/observability';

import { ActiveWorkflows } from '../active-workflows';
import type { IGetExecuteTriggerFunctions } from '../interfaces';
import type { PollContext } from '../node-execution-context';
import type { ScheduledTaskManager } from '../scheduled-task-manager';
import type { TriggersAndPollers } from '../triggers-and-pollers';

describe('ActiveWorkflows', () => {
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
	const scheduledTaskManager = mock<ScheduledTaskManager>();
	const triggersAndPollers = mock<TriggersAndPollers>();
	const errorReporter = mock<ErrorReporter>();
	const triggerNode = mock<INode>();
	const pollNode = mock<INode>();

	let activeWorkflows: ActiveWorkflows;
	let acquireIsolate: Mock;
	let releaseIsolate: Mock;

	// The cron callback registered for scheduled polls is `() => void executeTrigger()` —
	// fire-and-forget. A single `await callback()` returns immediately, so we yield to
	// the event loop via setImmediate to let the full async chain settle.
	const flushPromises = async () => await new Promise<void>((resolve) => setImmediate(resolve));

	beforeEach(() => {
		vi.clearAllMocks();
		acquireIsolate = vi.fn().mockResolvedValue(undefined);
		releaseIsolate = vi.fn().mockResolvedValue(undefined);
		// @ts-expect-error -- assign minimal expression stub for isolate-acquisition tests
		workflow.expression = { acquireIsolate, releaseIsolate };
		activeWorkflows = new ActiveWorkflows(
			mock(),
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
			triggersAndPollers.runTrigger.mockRejectedValueOnce(triggerError);
		} else {
			triggersAndPollers.runTrigger.mockResolvedValue(triggerResponse);
		}

		if (pollError) {
			triggersAndPollers.runPoll.mockRejectedValueOnce(pollError);
		} else {
			getPollFunctions.mockReturnValue(pollFunctions);
		}

		return await activeWorkflows.add(
			workflowId,
			workflow,
			additionalData,
			mode,
			activation,
			getTriggerFunctions,
			getPollFunctions,
		);
	};

	describe('add()', () => {
		describe('should activate workflow', () => {
			it('with trigger nodes', async () => {
				await addWorkflow({ triggerNodes: [triggerNode] });

				expect(activeWorkflows.isActive(workflowId)).toBe(true);
				expect(workflow.getTriggerNodes).toHaveBeenCalled();
				expect(triggersAndPollers.runTrigger).toHaveBeenCalledWith(
					workflow,
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
			});

			it('with polling nodes', async () => {
				await addWorkflow({ pollNodes: [pollNode] });

				expect(activeWorkflows.isActive(workflowId)).toBe(true);
				expect(workflow.getPollNodes).toHaveBeenCalled();
				expect(scheduledTaskManager.registerCron).toHaveBeenCalled();
			});

			it('with both trigger and polling nodes', async () => {
				await addWorkflow({ triggerNodes: [triggerNode], pollNodes: [pollNode] });

				expect(activeWorkflows.isActive(workflowId)).toBe(true);
				expect(workflow.getTriggerNodes).toHaveBeenCalled();
				expect(workflow.getPollNodes).toHaveBeenCalled();
				expect(triggersAndPollers.runTrigger).toHaveBeenCalledWith(
					workflow,
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
				expect(scheduledTaskManager.registerCron).toHaveBeenCalled();
				expect(triggersAndPollers.runPoll).toHaveBeenCalledWith(workflow, pollNode, pollFunctions);
			});
		});

		describe('should throw error', () => {
			it('if trigger activation fails', async () => {
				const error = new Error('Trigger activation failed');
				await expect(
					addWorkflow({ triggerNodes: [triggerNode], triggerError: error }),
				).rejects.toThrow(WorkflowActivationError);
				expect(activeWorkflows.isActive(workflowId)).toBe(false);
			});

			it('if polling activation fails', async () => {
				const error = new Error('Failed to activate polling');
				await expect(addWorkflow({ pollNodes: [pollNode], pollError: error })).rejects.toThrow(
					WorkflowActivationError,
				);
				expect(activeWorkflows.isActive(workflowId)).toBe(false);
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

		describe('should acquire expression isolate around scheduled polls', () => {
			// Regression test for CAT-3147: scheduled cron-driven polls run outside
			// the activation acquire/release window, so the expression bridge fails
			// with "No bridge acquired for this context" on every tick.
			it('should acquire and release the isolate when the scheduled poll fires', async () => {
				triggersAndPollers.runPoll.mockResolvedValueOnce(null); // initial activation test poll
				triggersAndPollers.runPoll.mockResolvedValueOnce(null); // scheduled poll

				await addWorkflow({ pollNodes: [pollNode] });

				acquireIsolate.mockClear();
				releaseIsolate.mockClear();
				triggersAndPollers.runPoll.mockClear();

				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeScheduledPoll = registerCronCall[1] as () => Promise<void>;

				await executeScheduledPoll();
				await flushPromises();

				expect(acquireIsolate).toHaveBeenCalledTimes(1);
				expect(releaseIsolate).toHaveBeenCalledTimes(1);
				expect(triggersAndPollers.runPoll).toHaveBeenCalledTimes(1);

				const [acquireOrder] = acquireIsolate.mock.invocationCallOrder;
				const [runPollOrder] = triggersAndPollers.runPoll.mock.invocationCallOrder;
				const [releaseOrder] = releaseIsolate.mock.invocationCallOrder;

				expect(acquireOrder).toBeLessThan(runPollOrder);
				expect(runPollOrder).toBeLessThan(releaseOrder);
			});

			it('should not acquire the isolate during the initial activation test poll', async () => {
				// The outer ActiveWorkflowManager.add() acquire covers the test poll
				// and the subsequent countTriggers call. Nested acquire/release would
				// release the outer's bridge early and break countTriggers.
				triggersAndPollers.runPoll.mockResolvedValueOnce(null);

				await addWorkflow({ pollNodes: [pollNode] });

				expect(triggersAndPollers.runPoll).toHaveBeenCalledTimes(1);
				expect(acquireIsolate).not.toHaveBeenCalled();
				expect(releaseIsolate).not.toHaveBeenCalled();
			});

			it('should release the isolate when __emit throws after a successful poll', async () => {
				const pollData = [[{ json: { foo: 'bar' } }]];
				triggersAndPollers.runPoll.mockResolvedValueOnce(null); // initial activation test poll
				triggersAndPollers.runPoll.mockResolvedValueOnce(pollData); // scheduled poll returns data

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

			it('should release the isolate even when the scheduled poll throws', async () => {
				const error = new Error('Poll function failed');
				triggersAndPollers.runPoll
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

				expect(triggersAndPollers.runPoll).toHaveBeenCalledWith(workflow, pollNode, pollFunctions);
				expect(pollFunctions.__emit).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			});

			it('should emit error when poll fails during regular polling', async () => {
				const error = new Error('Poll function failed');
				triggersAndPollers.runPoll
					.mockResolvedValueOnce(null) // Succeed on first call (testing)
					.mockRejectedValueOnce(error); // Fail on second call (regular polling)

				await addWorkflow({ pollNodes: [pollNode] });

				// Get the executeTrigger function that was registered
				const registerCronCall = scheduledTaskManager.registerCron.mock.calls[0];
				const executeTrigger = registerCronCall[1] as () => Promise<void>;

				// Execute the trigger function to simulate a regular poll
				await executeTrigger();
				await flushPromises();

				expect(triggersAndPollers.runPoll).toHaveBeenCalledTimes(2);
				expect(pollFunctions.__emit).not.toHaveBeenCalled();
				expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			});
		});
	});

	describe('remove()', () => {
		const setupForRemoval = async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });
			return await activeWorkflows.remove(workflowId);
		};

		it('should remove an active workflow', async () => {
			const result = await setupForRemoval();

			expect(result).toBe(true);
			expect(activeWorkflows.isActive(workflowId)).toBe(false);
			expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith(workflowId);
			expect(triggerResponse.closeFunction).toHaveBeenCalled();
		});

		it('should return false when removing non-existent workflow', async () => {
			const result = await activeWorkflows.remove('non-existent');

			expect(result).toBe(false);
			expect(scheduledTaskManager.deregisterCrons).not.toHaveBeenCalled();
		});

		it('should handle TriggerCloseError when closing trigger', async () => {
			const triggerCloseError = new TriggerCloseError(triggerNode, { level: 'warning' });
			(triggerResponse.closeFunction as Mock).mockRejectedValueOnce(triggerCloseError);

			const result = await setupForRemoval();

			expect(result).toBe(true);
			expect(activeWorkflows.isActive(workflowId)).toBe(false);
			expect(triggerResponse.closeFunction).toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledWith(triggerCloseError, {
				extra: { workflowId },
			});
		});

		it('should throw WorkflowDeactivationError when closeFunction throws regular error', async () => {
			const error = new Error('Close function failed');
			(triggerResponse.closeFunction as Mock).mockRejectedValueOnce(error);

			await addWorkflow({ triggerNodes: [triggerNode] });

			await expect(activeWorkflows.remove(workflowId)).rejects.toThrow(
				`Failed to deactivate trigger of workflow ID "${workflowId}": "Close function failed"`,
			);

			expect(triggerResponse.closeFunction).toHaveBeenCalled();
			expect(errorReporter.error).not.toHaveBeenCalled();
		});
	});

	describe('get() and isActive()', () => {
		it('should return workflow data for active workflow', async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });

			expect(activeWorkflows.isActive(workflowId)).toBe(true);
			expect(activeWorkflows.get(workflowId)).toBeDefined();
		});

		it('should return undefined for non-active workflow', () => {
			expect(activeWorkflows.isActive('non-existent')).toBe(false);
			expect(activeWorkflows.get('non-existent')).toBeUndefined();
		});
	});

	describe('allActiveWorkflows()', () => {
		it('should return all active workflow IDs', async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });

			const activeIds = activeWorkflows.allActiveWorkflows();

			expect(activeIds).toEqual([workflowId]);
		});
	});

	describe('removeAllTriggerAndPollerBasedWorkflows()', () => {
		it('should remove all active workflows', async () => {
			await addWorkflow({ triggerNodes: [triggerNode] });

			await activeWorkflows.removeAllTriggerAndPollerBasedWorkflows();

			expect(activeWorkflows.allActiveWorkflows()).toEqual([]);
			expect(scheduledTaskManager.deregisterCrons).toHaveBeenCalledWith(workflowId);
		});
	});
});
