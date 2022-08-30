/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { CronJob } from 'cron';

import {
	IGetExecutePollFunctions,
	IGetExecuteTriggerFunctions,
	INode,
	IPollResponse,
	ITriggerResponse,
	IWorkflowExecuteAdditionalData,
	LoggerProxy as Logger,
	TriggerTime,
	toCronExpression,
	Workflow,
	WorkflowActivateMode,
	WorkflowActivationError,
	WorkflowExecuteMode,
} from 'n8n-workflow';

// eslint-disable-next-line import/no-cycle
import type { IWorkflowData } from '.';

export class ActiveWorkflows {
	private workflowData: {
		[key: string]: IWorkflowData;
	} = {};

	/**
	 * Returns if the workflow is active
	 *
	 * @param {string} id The id of the workflow to check
	 * @returns {boolean}
	 * @memberof ActiveWorkflows
	 */
	isActive(id: string): boolean {
		// eslint-disable-next-line no-prototype-builtins
		return this.workflowData.hasOwnProperty(id);
	}

	/**
	 * Returns the ids of the currently active workflows
	 *
	 * @returns {string[]}
	 * @memberof ActiveWorkflows
	 */
	allActiveWorkflows(): string[] {
		return Object.keys(this.workflowData);
	}

	/**
	 * Returns the Workflow data for the workflow with
	 * the given id if it is currently active
	 *
	 * @param {string} id
	 * @returns {(WorkflowData | undefined)}
	 * @memberof ActiveWorkflows
	 */
	get(id: string): IWorkflowData | undefined {
		return this.workflowData[id];
	}

	/**
	 * Makes a workflow active
	 *
	 * @param {string} id The id of the workflow to activate
	 * @param {Workflow} workflow The workflow to activate
	 * @param {IWorkflowExecuteAdditionalData} additionalData The additional data which is needed to run workflows
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflows
	 */
	async add(
		id: string,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		getPollFunctions: IGetExecutePollFunctions,
	): Promise<void> {
		this.workflowData[id] = {};
		const triggerNodes = workflow.getTriggerNodes();

		let triggerResponse: ITriggerResponse | undefined;
		this.workflowData[id].triggerResponses = [];
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
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.workflowData[id].triggerResponses!.push(triggerResponse);
				}
			} catch (error) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				throw new WorkflowActivationError(
					'There was a problem activating the workflow',
					error,
					triggerNode,
				);
			}
		}

		const pollNodes = workflow.getPollNodes();
		if (pollNodes.length) {
			this.workflowData[id].pollResponses = [];
			for (const pollNode of pollNodes) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					this.workflowData[id].pollResponses!.push(
						await this.activatePolling(
							pollNode,
							workflow,
							additionalData,
							getPollFunctions,
							mode,
							activation,
						),
					);
				} catch (error) {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					throw new WorkflowActivationError(
						'There was a problem activating the workflow',
						error,
						pollNode,
					);
				}
			}
		}
	}

	/**
	 * Activates polling for the given node
	 *
	 * @param {INode} node
	 * @param {Workflow} workflow
	 * @param {IWorkflowExecuteAdditionalData} additionalData
	 * @param {IGetExecutePollFunctions} getPollFunctions
	 * @returns {Promise<IPollResponse>}
	 * @memberof ActiveWorkflows
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
		const executeTrigger = async () => {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			Logger.debug(`Polling trigger initiated for workflow "${workflow.name}"`, {
				workflowName: workflow.name,
				workflowId: workflow.id,
			});
			const pollResponse = await workflow.runPoll(node, pollFunctions);

			if (pollResponse !== null) {
				// eslint-disable-next-line no-underscore-dangle
				pollFunctions.__emit(pollResponse);
			}
		};

		// Execute the trigger directly to be able to know if it works
		await executeTrigger();

		const timezone = pollFunctions.getTimezone();

		// Start the cron-jobs
		const cronJobs: CronJob[] = [];
		// eslint-disable-next-line @typescript-eslint/no-shadow
		for (const cronTime of cronTimes) {
			const cronTimeParts = cronTime.split(' ');
			if (cronTimeParts.length > 0 && cronTimeParts[0].includes('*')) {
				throw new Error('The polling interval is too short. It has to be at least a minute!');
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
	 * Makes a workflow inactive
	 *
	 * @param {string} id The id of the workflow to deactivate
	 * @returns {Promise<void>}
	 * @memberof ActiveWorkflows
	 */
	async remove(id: string): Promise<void> {
		if (!this.isActive(id)) {
			// Workflow is currently not registered
			throw new Error(
				`The workflow with the id "${id}" is currently not active and can so not be removed`,
			);
		}

		const workflowData = this.workflowData[id];

		if (workflowData.triggerResponses) {
			for (const triggerResponse of workflowData.triggerResponses) {
				if (triggerResponse.closeFunction) {
					try {
						await triggerResponse.closeFunction();
					} catch (error) {
						Logger.error(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
							`There was a problem deactivating trigger of workflow "${id}": "${error.message}"`,
							{
								workflowId: id,
							},
						);
					}
				}
			}
		}

		if (workflowData.pollResponses) {
			for (const pollResponse of workflowData.pollResponses) {
				if (pollResponse.closeFunction) {
					try {
						await pollResponse.closeFunction();
					} catch (error) {
						Logger.error(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
							`There was a problem deactivating polling trigger of workflow "${id}": "${error.message}"`,
							{
								workflowId: id,
							},
						);
					}
				}
			}
		}

		delete this.workflowData[id];
	}
}
