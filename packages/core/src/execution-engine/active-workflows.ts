import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	CronContext,
	INode,
	IPollFunctions,
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
import { SpanStatus, Tracing } from '@/observability';

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
		private readonly tracing: Tracing,
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
		const triggersByNode = new Map<string, ITriggerResponse[]>();

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

					const existing = triggersByNode.get(triggerNode.name) ?? [];
					existing.push(triggerResponse);
					triggersByNode.set(triggerNode.name, existing);
				}
			} catch (e) {
				const error = e instanceof Error ? e : new Error(`${e}`);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: triggerNode },
				);
			}
		}

		this.activeWorkflows[workflowId] = { triggerResponses, triggersByNode };

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
		const executeTrigger = this.createPollExecuteFn(workflow, node, pollFunctions);

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

	/**
	 * Add specific trigger/poller nodes to an already-active workflow.
	 * Used by the outbox consumer for granular node-level updates.
	 */
	async addNodes(
		workflowId: string,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		getPollFunctions: IGetExecutePollFunctions,
		triggerNodes: INode[],
		pollNodes: INode[],
	) {
		if (!this.isActive(workflowId)) {
			throw new WorkflowActivationError(`Cannot add nodes to inactive workflow "${workflowId}"`);
		}

		const workflowData = this.activeWorkflows[workflowId];

		if (!workflowData.triggersByNode) {
			workflowData.triggersByNode = new Map();
		}

		for (const triggerNode of triggerNodes) {
			const triggerResponse = await this.triggersAndPollers.runTrigger(
				workflow,
				triggerNode,
				getTriggerFunctions,
				additionalData,
				mode,
				activation,
			);

			if (triggerResponse !== undefined) {
				if (!workflowData.triggerResponses) {
					workflowData.triggerResponses = [];
				}
				workflowData.triggerResponses.push(triggerResponse);

				const existing = workflowData.triggersByNode.get(triggerNode.name) ?? [];
				existing.push(triggerResponse);
				workflowData.triggersByNode.set(triggerNode.name, existing);
			}
		}

		for (const pollNode of pollNodes) {
			await this.activatePolling(
				pollNode,
				workflow,
				additionalData,
				getPollFunctions,
				mode,
				activation,
			);
		}
	}

	/**
	 * Remove specific trigger/poller nodes from an already-active workflow.
	 * Used by the outbox consumer for granular node-level updates.
	 *
	 * @param nodeNames - human-readable node names (keys in triggersByNode)
	 * @param nodeIds - node UUIDs for cron deregistration (CronContext uses node.id)
	 */
	async removeNodes(workflowId: string, nodeNames: string[], nodeIds: Set<string>) {
		if (!this.isActive(workflowId)) return;

		const workflowData = this.activeWorkflows[workflowId];

		const { triggersByNode } = workflowData;

		for (const nodeName of nodeNames) {
			const responses = triggersByNode?.get(nodeName);
			if (responses) {
				for (const response of responses) {
					await this.closeTrigger(response, workflowId);
				}
				triggersByNode?.delete(nodeName);
			}
		}

		// Rebuild triggerResponses from the remaining triggersByNode entries
		if (workflowData.triggersByNode) {
			workflowData.triggerResponses = [];
			for (const responses of workflowData.triggersByNode.values()) {
				workflowData.triggerResponses.push(...responses);
			}
		}

		this.scheduledTaskManager.deregisterCronsForNodes(workflowId, nodeIds);
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

	/**
	 * Creates a function that executes the poll function for a given workflow
	 * and node and triggers a workflow execution based on the output.
	 */
	private createPollExecuteFn(
		workflow: Workflow,
		node: INode,
		pollFunctions: IPollFunctions,
	): (testingTrigger?: boolean) => Promise<void> {
		return async (testingTrigger = false) => {
			return await this.tracing.startSpan(
				{
					name: 'Workflow Trigger Poll',
					op: 'trigger.poll',
					attributes: {
						...this.tracing.pickWorkflowAttributes(workflow),
						...this.tracing.pickNodeAttributes(node),
					},
				},
				async (span) => {
					this.logger.debug(`Polling trigger initiated for workflow "${workflow.name}"`, {
						workflowName: workflow.name,
						workflowId: workflow.id,
					});

					try {
						const pollResponse = await this.triggersAndPollers.runPoll(
							workflow,
							node,
							pollFunctions,
						);

						if (pollResponse !== null) {
							pollFunctions.__emit(pollResponse);
						}

						span.setStatus({ code: SpanStatus.ok });
					} catch (error) {
						span.setStatus({ code: SpanStatus.error });
						// If the poll function fails in the first activation
						// throw the error back so we let the user know there is
						// an issue with the trigger.
						if (testingTrigger) {
							throw error;
						}
						pollFunctions.__emitError(error as Error);
					}
				},
			);
		};
	}
}
