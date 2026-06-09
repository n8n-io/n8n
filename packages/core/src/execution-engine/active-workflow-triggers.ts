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
	ensureError,
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
		// Tear down any registration still lingering for this workflow before readding it.
		await this.remove(workflowId);

		const triggerFunctionNodes = workflow.getTriggerNodes();

		const triggers = new WorkflowActiveTriggersState();

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
				const error = ensureError(e);

				// Tear down anything an earlier node already registered, so a failed
				// activation doesn't leave triggers or crons running.
				await this.rollbackPartialActivation(workflowId, triggers);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: triggerNode },
				);
			}
		}

		this.activeTriggersByWorkflowId.set(workflowId, triggers);

		const pollTriggerNodes = workflow.getPollNodes();

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
				// A failed activation must not leave the workflow half-active. Drop it
				// from memory and tear down every trigger and cron registered so far.
				this.activeTriggersByWorkflowId.delete(workflowId);
				await this.rollbackPartialActivation(workflowId, triggers);

				const error = ensureError(e);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: pollNode },
				);
			}
		}
	}

	/**
	 * Tears down everything an in-progress activation registered before it
	 * failed — the trigger responses' close functions and any crons — so a
	 * failed activation leaves nothing running. Best-effort: a failing close
	 * function is reported but does not stop the remaining cleanup, and the
	 * original activation error is still surfaced to the caller.
	 */
	private async rollbackPartialActivation(workflowId: string, triggers: WorkflowActiveTriggersState) {
		// Stop the crons first: deregistration is synchronous and is what actually
		// prevents the failed activation from continuing to fire.
		this.scheduledTaskManager.deregisterCrons(workflowId);

		for (const response of triggers.triggerResponses) {
			try {
				await this.closeTrigger(response, workflowId);
			} catch (e) {
				this.errorReporter.error(ensureError(e), { extra: { workflowId } });
			}
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
		// Ensure crons are deregistered to prevent executions on inactive workflows
		const hadRegisteredCrons = this.scheduledTaskManager.deregisterCrons(workflowId);

		if (!this.isActive(workflowId)) {
			if (hadRegisteredCrons) {
				// Crons were registered for an inactive workflow, which shouldn't happen
				this.logger.warn(
					`Deregistered orphaned crons for workflow not tracked as active: "${workflowId}"`,
					{ workflowId },
				);
			}

			return false;
		}

		const triggers = this.activeTriggersByWorkflowId.get(workflowId);
		for (const r of triggers?.triggerResponses ?? []) {
			await this.closeTrigger(r, workflowId);
		}

		this.activeTriggersByWorkflowId.delete(workflowId);

		return true;
	}

	async removeAllNonWebhookTriggerWorkflows() {
		// Sweep both workflows tracked as active AND any that still have registered
		// crons but are no longer tracked (stranded orphans). On leader stepdown the
		// process keeps running as a follower, so an orphan left behind here would
		// survive the demotion and resurface/stack on the next leader takeover.
		const workflowIds = new Set([
			...this.activeTriggersByWorkflowId.keys(),
			...this.scheduledTaskManager.getWorkflowIdsWithCrons(),
		]);

		if (workflowIds.size === 0) return;

		for (const workflowId of workflowIds) {
			await this.remove(workflowId);
		}

		this.logger.debug('Deactivated non-webhook triggers and cleared any stranded crons', {
			workflowIds: Array.from(workflowIds),
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
