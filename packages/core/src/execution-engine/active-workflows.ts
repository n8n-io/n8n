import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	CronContext,
	INode,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	TriggerTime,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	toCronExpression,
	TriggerCloseError,
	UserError,
	WorkflowActivationError,
	WorkflowDeactivationError,
} from 'n8n-workflow';

import { ErrorReporter } from '@/errors/error-reporter';
import type { IWorkflowData } from '@/interfaces';

import type { IGetExecutePollFunctions, IGetExecuteTriggerFunctions } from './interfaces';
import { ScheduledTaskManager } from './scheduled-task-manager';
import { TriggersAndPollers } from './triggers-and-pollers';

@Service()
export class ActiveWorkflows {
	constructor(
		private readonly logger: Logger,
		private readonly scheduledTaskManager: ScheduledTaskManager,
		private readonly triggersAndPollers: TriggersAndPollers,
		private readonly errorReporter: ErrorReporter,
	) {}

	private activeWorkflows: { [workflowId: string]: IWorkflowData } = {};

	/**
	 * Returns if the workflow is active in memory.
	 */
	isActive(workflowId: string) {
		return this.activeWorkflows.hasOwnProperty(workflowId);
	}

	/**
	 * Returns the IDs of the currently active workflows in memory.
	 */
	allActiveWorkflows() {
		return Object.keys(this.activeWorkflows);
	}

	/**
	 * Returns the workflow data for the given ID if currently active in memory.
	 */
	get(workflowId: string) {
		return this.activeWorkflows[workflowId];
	}

	/**
	 * Makes a workflow active
	 *
	 * @param {string} workflowId The id of the workflow to activate
	 * @param {Workflow} workflow The workflow to activate
	 * @param {IWorkflowExecuteAdditionalData} additionalData The additional data which is needed to run workflows
	 */
	async add(
		workflowId: string,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		getPollFunctions: IGetExecutePollFunctions,
	) {
		const triggerNodes = workflow.getTriggerNodes();

		const triggerResponses: ITriggerResponse[] = [];

		for (const triggerNode of triggerNodes) {
			try {
				const triggerResponse = await this.triggersAndPollers.runTrigger(
					workflow,
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
				if (triggerResponse !== undefined) {
					triggerResponses.push(triggerResponse);
				}
			} catch (e) {
				const error = e instanceof Error ? e : new Error(`${e}`);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: triggerNode },
				);
			}
		}

		this.activeWorkflows[workflowId] = { triggerResponses };

		const pollingNodes = workflow.getPollNodes();

		if (pollingNodes.length === 0) return;

		for (const pollNode of pollingNodes) {
			try {
				await this.activatePolling(
					pollNode,
					workflow,
					additionalData,
					getPollFunctions,
					mode,
					activation,
				);
			} catch (e) {
				// Do not mark this workflow as active if there are no triggerResponses, and any polling activation failed
				if (triggerResponses.length === 0) {
					delete this.activeWorkflows[workflowId];
				}

				const error = e instanceof Error ? e : new Error(`${e}`);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: pollNode },
				);
			}
		}
	}

	/**
	 * Activates polling for the given node
	 */
	private async activatePolling(
		node: INode,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		getPollFunctions: IGetExecutePollFunctions,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		const pollFunctions = getPollFunctions(workflow, node, additionalData, mode, activation);

		const pollTimes = pollFunctions.getNodeParameter('pollTimes') as unknown as {
			item: TriggerTime[];
		};

		// Get all the trigger times
		const cronExpressions = (pollTimes.item || []).map(toCronExpression);
		// The trigger function to execute when the cron-time got reached
		const executeTrigger = async (testingTrigger = false) => {
			this.logger.debug(`Polling trigger initiated for workflow "${workflow.name}"`, {
				workflowName: workflow.name,
				workflowId: workflow.id,
			});

			try {
				const pollResponse = await this.triggersAndPollers.runPoll(workflow, node, pollFunctions);

				if (pollResponse !== null) {
					pollFunctions.__emit(pollResponse);
				}
			} catch (error) {
				// If the poll function fails in the first activation
				// throw the error back so we let the user know there is
				// an issue with the trigger.
				if (testingTrigger) {
					throw error;
				}
				pollFunctions.__emitError(error as Error);
			}
		};

		// Execute the trigger directly to be able to know if it works
		await executeTrigger(true);

		for (const expression of cronExpressions) {
			if (expression.split(' ').at(0)?.includes('*')) {
				throw new UserError('The polling interval is too short. It has to be at least a minute.');
			}

			const ctx: CronContext = {
				workflowId: workflow.id,
				timezone: workflow.timezone,
				nodeId: node.id,
				expression,
			};

			this.scheduledTaskManager.registerCron(ctx, executeTrigger);
		}
	}

	/**
	 * Makes a workflow inactive in memory.
	 */
	async remove(workflowId: string) {
		if (!this.isActive(workflowId)) {
			this.logger.warn(`Cannot deactivate already inactive workflow ID "${workflowId}"`);
			return false;
		}

		this.scheduledTaskManager.deregisterCrons(workflowId);

		const w = this.activeWorkflows[workflowId];
		for (const r of w.triggerResponses ?? []) {
			await this.closeTrigger(r, workflowId);
		}

		delete this.activeWorkflows[workflowId];

		return true;
	}

	async removeAllTriggerAndPollerBasedWorkflows() {
		const activeWorkflowIds = Object.keys(this.activeWorkflows);

		if (activeWorkflowIds.length === 0) return;

		for (const workflowId of activeWorkflowIds) {
			await this.remove(workflowId);
		}

		this.logger.debug('Deactivated all trigger- and poller-based workflows', {
			workflowIds: activeWorkflowIds,
		});
	}

	private async closeTrigger(response: ITriggerResponse, workflowId: string) {
		if (!response.closeFunction) return;

		try {
			await response.closeFunction();
		} catch (e) {
			if (e instanceof TriggerCloseError) {
				this.logger.error(
					`There was a problem calling "closeFunction" on "${e.node.name}" in workflow "${workflowId}"`,
				);
				this.errorReporter.error(e, { extra: { workflowId } });
				return;
			}

			const error = e instanceof Error ? e : new Error(`${e}`);

			throw new WorkflowDeactivationError(
				`Failed to deactivate trigger of workflow ID "${workflowId}": "${error.message}"`,
				{ cause: error, workflowId },
			);
		}
	}
}
