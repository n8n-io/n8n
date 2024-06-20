import { Service } from 'typedi';
import { CronJob } from 'cron';

import type {
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	IPollResponse,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	TriggerTime,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ApplicationError,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	toCronExpression,
	TriggerCloseError,
	WorkflowActivationError,
	WorkflowDeactivationError,
} from 'n8n-workflow';

import type { IWorkflowData } from './Interfaces';

@Service()
export class ActiveWorkflows {
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
		this.activeWorkflows[workflowId] = {};
		const triggerNodes = workflow.getTriggerNodes();

		let triggerResponse: ITriggerResponse | undefined;

		this.activeWorkflows[workflowId].triggerResponses = [];

		for (const triggerNode of triggerNodes) {
			try {
				triggerResponse = await workflow.runTrigger(
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
				if (triggerResponse !== undefined) {
					// If a response was given save it

					this.activeWorkflows[workflowId].triggerResponses!.push(triggerResponse);
				}
			} catch (e) {
				const error = e instanceof Error ? e : new Error(`${e}`);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: triggerNode },
				);
			}
		}

		const pollingNodes = workflow.getPollNodes();

		if (pollingNodes.length === 0) return;

		this.activeWorkflows[workflowId].pollResponses = [];

		for (const pollNode of pollingNodes) {
			try {
				this.activeWorkflows[workflowId].pollResponses!.push(
					await this.activatePolling(
						pollNode,
						workflow,
						additionalData,
						getPollFunctions,
						mode,
						activation,
					),
				);
			} catch (e) {
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
	async activatePolling(
		node: INode,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		getPollFunctions: IGetExecutePollFunctions,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<IPollResponse> {
		const pollFunctions = getPollFunctions(workflow, node, additionalData, mode, activation);

		const pollTimes = pollFunctions.getNodeParameter('pollTimes') as unknown as {
			item: TriggerTime[];
		};

		// Get all the trigger times
		const cronTimes = (pollTimes.item || []).map(toCronExpression);
		// The trigger function to execute when the cron-time got reached
		const executeTrigger = async (testingTrigger = false) => {
			Logger.debug(`Polling trigger initiated for workflow "${workflow.name}"`, {
				workflowName: workflow.name,
				workflowId: workflow.id,
			});

			try {
				const pollResponse = await workflow.runPoll(node, pollFunctions);

				if (pollResponse !== null) {
					pollFunctions.__emit(pollResponse);
				}
			} catch (error) {
				// If the poll function failes in the first activation
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

		const timezone = pollFunctions.getTimezone();

		// Start the cron-jobs
		const cronJobs: CronJob[] = [];

		for (const cronTime of cronTimes) {
			const cronTimeParts = cronTime.split(' ');
			if (cronTimeParts.length > 0 && cronTimeParts[0].includes('*')) {
				throw new ApplicationError(
					'The polling interval is too short. It has to be at least a minute.',
				);
			}

			cronJobs.push(new CronJob(cronTime, executeTrigger, undefined, true, timezone));
		}

		// Stop the cron-jobs
		async function closeFunction() {
			for (const cronJob of cronJobs) {
				cronJob.stop();
			}
		}

		return {
			closeFunction,
		};
	}

	/**
	 * Makes a workflow inactive in memory.
	 */
	async remove(workflowId: string) {
		if (!this.isActive(workflowId)) {
			Logger.warn(`Cannot deactivate already inactive workflow ID "${workflowId}"`);
			return false;
		}

		const w = this.activeWorkflows[workflowId];

		for (const r of w.triggerResponses ?? []) {
			await this.close(r, workflowId, 'trigger');
		}

		for (const r of w.pollResponses ?? []) {
			await this.close(r, workflowId, 'poller');
		}

		delete this.activeWorkflows[workflowId];

		return true;
	}

	async removeAllTriggerAndPollerBasedWorkflows() {
		for (const workflowId of Object.keys(this.activeWorkflows)) {
			await this.remove(workflowId);
		}
	}

	private async close(
		response: ITriggerResponse | IPollResponse,
		workflowId: string,
		target: 'trigger' | 'poller',
	) {
		if (!response.closeFunction) return;

		try {
			await response.closeFunction();
		} catch (e) {
			if (e instanceof TriggerCloseError) {
				Logger.error(
					`There was a problem calling "closeFunction" on "${e.node.name}" in workflow "${workflowId}"`,
				);
				ErrorReporter.error(e, { extra: { target, workflowId } });
				return;
			}

			const error = e instanceof Error ? e : new Error(`${e}`);

			throw new WorkflowDeactivationError(
				`Failed to deactivate ${target} of workflow ID "${workflowId}": "${error.message}"`,
				{ cause: error, workflowId },
			);
		}
	}
}
