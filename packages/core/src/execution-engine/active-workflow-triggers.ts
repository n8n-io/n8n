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
import { SpanStatus, Tracing } from '@/observability';

import type { IGetExecutePollFunctions, IGetExecuteTriggerFunctions } from './interfaces';
import { ScheduledTaskManager } from './scheduled-task-manager';
import { TriggersAndPollers } from './triggers-and-pollers';
import { WorkflowActiveTriggersState } from './workflow-active-triggers-state';

/**
 * Holds the in-memory state of which non-webhook triggers (active, schedule
 * and poll triggers) have been activated on this specific main instance. Webhook
 * triggers are not tracked here — they live in the `webhook_entity` table.
 */
@Service()
export class ActiveWorkflowTriggers {
	constructor(
		private readonly logger: Logger,
		private readonly scheduledTaskManager: ScheduledTaskManager,
		private readonly triggersAndPollers: TriggersAndPollers,
		private readonly errorReporter: ErrorReporter,
		private readonly tracing: Tracing,
	) {}

	private activeTriggersByWorkflowId = new Map<string, WorkflowActiveTriggersState>();

	/**
	 * Returns if the workflow is active in memory.
	 */
	isActive(workflowId: string) {
		return this.activeTriggersByWorkflowId.has(workflowId);
	}

	/**
	 * Returns the IDs of the currently active workflows in memory.
	 */
	allActiveWorkflows() {
		return Array.from(this.activeTriggersByWorkflowId.keys());
	}

	/**
	 * Returns the workflow data for the given ID if currently active in memory.
	 */
	get(workflowId: string) {
		return this.activeTriggersByWorkflowId.get(workflowId);
	}

	/**
	 * Makes a workflow active by registering all of its trigger and poll nodes.
	 *
	 * @param {string} workflowId The id of the workflow to activate
	 * @param {Workflow} workflow The workflow to activate
	 * @param {IWorkflowExecuteAdditionalData} additionalData The additional data which is needed to run workflows
	 */
	async addAllTriggers(
		workflowId: string,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		getPollFunctions: IGetExecutePollFunctions,
	) {
		const nodeIds = [...workflow.getTriggerNodes(), ...workflow.getPollNodes()].map(
			(node) => node.id,
		);

		await this.addTriggers(
			workflowId,
			workflow,
			nodeIds,
			additionalData,
			mode,
			activation,
			getTriggerFunctions,
			getPollFunctions,
		);
	}

	/**
	 * Activates the given subset of a workflow's trigger and poll nodes, merging
	 * them into any triggers already active for the workflow. Used to apply a
	 * trigger-level diff during publication without disturbing unchanged triggers.
	 */
	async addTriggers(
		workflowId: string,
		workflow: Workflow,
		nodeIds: string[],
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		getPollFunctions: IGetExecutePollFunctions,
	) {
		const nodeIdSet = new Set(nodeIds);
		const existing = this.activeTriggersByWorkflowId.get(workflowId);
		const triggers = existing ?? new WorkflowActiveTriggersState();

		const triggerFunctionNodes = workflow
			.getTriggerNodes()
			.filter((node) => nodeIdSet.has(node.id));

		for (const triggerNode of triggerFunctionNodes) {
			try {
				const triggerResponse = await this.triggersAndPollers.runTriggerFunction(
					workflow,
					triggerNode,
					getTriggerFunctions,
					additionalData,
					mode,
					activation,
				);
				if (triggerResponse !== undefined) {
					triggers.add(triggerNode.id, triggerResponse);
				}
			} catch (e) {
				const error = e instanceof Error ? e : new Error(`${e}`);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: triggerNode },
				);
			}
		}

		this.activeTriggersByWorkflowId.set(workflowId, triggers);

		const pollTriggerNodes = workflow.getPollNodes().filter((node) => nodeIdSet.has(node.id));

		if (pollTriggerNodes.length === 0) return;

		for (const pollNode of pollTriggerNodes) {
			try {
				await this.activatePollTrigger(
					pollNode,
					workflow,
					additionalData,
					getPollFunctions,
					mode,
					activation,
				);
			} catch (e) {
				// Do not mark this workflow as active if there are no active or schedule
				// trigger responses, and any poll trigger activation failed. Leave an
				// already-active workflow's triggers in place.
				if (!existing && triggers.isEmpty) {
					this.activeTriggersByWorkflowId.delete(workflowId);
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
	 * Deactivates the given subset of a workflow's trigger and poll nodes,
	 * leaving the rest active. Closes each node's trigger response and
	 * deregisters its poll crons. Drops the workflow from the active set only
	 * when no triggers or crons remain for it.
	 */
	async removeTriggers(workflowId: string, nodeIds: string[]) {
		const triggers = this.activeTriggersByWorkflowId.get(workflowId);

		for (const nodeId of nodeIds) {
			const response = triggers?.get(nodeId);
			if (response) {
				await this.closeTrigger(response, workflowId);
			}
			triggers?.delete(nodeId);
			this.scheduledTaskManager.deregisterCron(workflowId, nodeId);
		}

		if (triggers?.isEmpty && !this.scheduledTaskManager.hasCrons(workflowId)) {
			this.activeTriggersByWorkflowId.delete(workflowId);
		}
	}

	/**
	 * Activates the given poll trigger node.
	 */
	private async activatePollTrigger(
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
		const executePollTrigger = this.createPollTriggerExecuteFn(workflow, node, pollFunctions);

		// Execute the poll trigger directly to be able to know if it works.
		await executePollTrigger(true);

		for (const expression of cronExpressions) {
			const fields = expression.split(' ');
			// 6-field expressions include seconds as the first field.
			// A wildcard there means sub-minute execution, which is too frequent.
			// 5-field expressions (standard cron) have minute-level granularity at minimum.
			if (fields.length === 6 && fields[0].includes('*')) {
				throw new UserError('The polling interval is too short. It has to be at least a minute.');
			}

			const ctx: CronContext = {
				workflowId: workflow.id,
				timezone: workflow.timezone,
				nodeId: node.id,
				expression,
			};

			this.scheduledTaskManager.registerCron(ctx, () => {
				void executePollTrigger();
			});
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

		const triggers = this.activeTriggersByWorkflowId.get(workflowId);
		for (const r of triggers?.triggerResponses ?? []) {
			await this.closeTrigger(r, workflowId);
		}

		this.activeTriggersByWorkflowId.delete(workflowId);

		return true;
	}

	async removeAllNonWebhookTriggerWorkflows() {
		const activeWorkflowIds = Array.from(this.activeTriggersByWorkflowId.keys());

		if (activeWorkflowIds.length === 0) return;

		for (const workflowId of activeWorkflowIds) {
			await this.remove(workflowId);
		}

		this.logger.debug('Deactivated all non-webhook trigger workflows', {
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
	 * Creates a function that executes the poll() implementation for a poll
	 * trigger node and triggers a workflow execution based on the output.
	 */
	private createPollTriggerExecuteFn(
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
					this.logger.debug(`Poll trigger initiated for workflow "${workflow.name}"`, {
						workflowName: workflow.name,
						workflowId: workflow.id,
					});

					// The initial activation poll runs inside ActiveWorkflowManager's
					// outer acquireIsolate window, which also covers countTriggers
					// afterwards. Acquiring here would release the outer bridge early
					// (acquire is idempotent per caller; release deletes it). Scheduled
					// polls fire from the cron scheduler's own async context outside
					// that window and must acquire/release per tick — see CAT-3147.
					const ownsIsolate = !testingTrigger;

					try {
						if (ownsIsolate) await workflow.expression.acquireIsolate();

						const pollResponse = await this.triggersAndPollers.runPollFunction(
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
						// If the poll trigger fails in the first activation
						// throw the error back so we let the user know there is
						// an issue with the trigger.
						if (testingTrigger) {
							throw error;
						}
						pollFunctions.__emitError(error as Error);
					} finally {
						if (ownsIsolate) await workflow.expression.releaseIsolate();
					}
				},
			);
		};
	}
}
