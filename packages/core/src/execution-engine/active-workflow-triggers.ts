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
	) {
		this.logger = logger.scoped('workflow-publication');
	}

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
	 * Returns the ids of the trigger and poll nodes currently registered in memory
	 * for the workflow. Unions the recorded trigger responses (active and schedule
	 * triggers) with the nodes that have registered crons (poll triggers), since a
	 * poll node lives only in the cron scheduler and never in the trigger-response
	 * state. Used by publication to reconcile a version against actual local state.
	 */
	getRegisteredTriggerNodeIds(workflowId: string): Set<string> {
		const triggers = this.activeTriggersByWorkflowId.get(workflowId);

		return new Set([
			...this.scheduledTaskManager.getCronNodeIds(workflowId),
			...(triggers?.nodeIds ?? []),
		]);
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
		// Tear down any registration still lingering for this workflow before readding it.
		await this.remove(workflowId);

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
		const triggersAddedDuringThisCall = new WorkflowActiveTriggersState();
		const triggerNodeIdsAddedDuringThisCall: string[] = [];

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
					triggersAddedDuringThisCall.add(triggerNode.id, triggerResponse);
					triggerNodeIdsAddedDuringThisCall.push(triggerNode.id);

					this.logTriggerActivation(workflow, triggerNode);
				}
			} catch (e) {
				const error = ensureError(e);

				// Tear down anything an earlier node already registered, so a failed
				// activation doesn't leave triggers or crons running.
				await this.rollbackPartialActivation(
					workflowId,
					triggersAddedDuringThisCall,
					existing ? nodeIdSet : undefined,
				);
				for (const nodeId of triggerNodeIdsAddedDuringThisCall) {
					triggers.delete(nodeId);
				}

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
					workflowId,
					pollNode,
					workflow,
					additionalData,
					getPollFunctions,
					mode,
					activation,
				);

				this.logTriggerActivation(workflow, pollNode);
			} catch (e) {
				if (!existing) {
					this.activeTriggersByWorkflowId.delete(workflowId);
				}
				await this.rollbackPartialActivation(
					workflowId,
					triggersAddedDuringThisCall,
					existing ? nodeIdSet : undefined,
				);
				for (const nodeId of triggerNodeIdsAddedDuringThisCall) {
					triggers.delete(nodeId);
				}

				const error = ensureError(e);

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
	async removeTriggers(workflowId: string, nodeIds: Set<INode['id']>) {
		const activeTriggers = this.activeTriggersByWorkflowId.get(workflowId);
		if (!activeTriggers) {
			for (const nodeId of nodeIds) {
				this.scheduledTaskManager.deregisterCron(workflowId, nodeId);
			}
			return;
		}

		for (const nodeId of nodeIds) {
			this.scheduledTaskManager.deregisterCron(workflowId, nodeId);

			const response = activeTriggers.get(nodeId);
			if (response) {
				await this.closeTrigger(response, workflowId);
			}
			activeTriggers.delete(nodeId);

			this.logTriggerDeactivation(workflowId, nodeId);
		}

		if (activeTriggers.isEmpty && !this.scheduledTaskManager.hasCrons(workflowId)) {
			this.activeTriggersByWorkflowId.delete(workflowId);
		}
	}

	/**
	 * Tears down everything an in-progress activation registered before it
	 * failed — the trigger responses' close functions and any crons — so a
	 * failed activation leaves nothing running. Best-effort: a failing close
	 * function is reported but does not stop the remaining cleanup, and the
	 * original activation error is still surfaced to the caller.
	 */
	private async rollbackPartialActivation(
		workflowId: string,
		triggers: WorkflowActiveTriggersState,
		nodeIds?: Iterable<string>,
	) {
		// Stop the crons first: deregistration is synchronous and is what actually
		// prevents the failed activation from continuing to fire.
		if (nodeIds) {
			for (const nodeId of nodeIds) {
				this.scheduledTaskManager.deregisterCron(workflowId, nodeId);
			}
		} else {
			this.scheduledTaskManager.deregisterCrons(workflowId);
		}

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
		workflowId: string,
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
		const executePollTrigger = this.createPollTriggerExecuteFn(
			workflowId,
			workflow,
			node,
			pollFunctions,
		);

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

	/**
	 * Workflow ids with non-webhook triggers active in memory, plus any that still
	 * have registered crons but are no longer tracked as active (stranded orphans).
	 * On leader stepdown the process keeps running as a follower, so an orphan left
	 * behind would survive the demotion and resurface/stack on the next takeover.
	 */
	getNonWebhookTriggerWorkflowIds(): string[] {
		return Array.from(
			new Set([
				...this.activeTriggersByWorkflowId.keys(),
				...this.scheduledTaskManager.getWorkflowIdsWithCrons(),
			]),
		);
	}

	async removeAllNonWebhookTriggerWorkflows() {
		const workflowIds = this.getNonWebhookTriggerWorkflowIds();

		if (workflowIds.length === 0) return;

		for (const workflowId of workflowIds) {
			await this.remove(workflowId);
		}

		this.logger.debug('Deactivated non-webhook triggers and cleared any stranded crons', {
			workflowIds,
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
		workflowId: string,
		workflow: Workflow,
		node: INode,
		pollFunctions: IPollFunctions,
	): (testingTrigger?: boolean) => Promise<void> {
		// Capture this activation's registration; `remove()` deletes this entry and
		// `add()` always assigns a fresh one, so if a scheduled poll finishes after the
		// workflow was removed or reactivated, it no longer matches and its
		// result, belonging to the now superseded version, must not be emitted.
		const registration = this.activeTriggersByWorkflowId.get(workflowId);
		const isSuperseded = () => this.activeTriggersByWorkflowId.get(workflowId) !== registration;

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

					// A scheduled poll can finish after the workflow was removed or
					// reactivated, so drop it if superseded to prevent executing the old version.
					if (!testingTrigger && isSuperseded()) {
						this.logger.debug(`Skipping poll for superseded workflow "${workflow.name}"`, {
							workflowId: workflow.id,
						});
						span.setStatus({ code: SpanStatus.ok });
						return;
					}

					try {
						if (ownsIsolate) await workflow.expression.acquireIsolate();

						const pollResponse = await this.triggersAndPollers.runPollFunction(
							workflow,
							node,
							pollFunctions,
						);

						// Same as the above `isSuperseded` check; last chance to check before
						// potentially starting the execution. Emitting now if superseded would run
						// an execution against the old version of the workflow, so drop it.
						// Bailing out here is safe even though `poll()` may have already advanced
						// its state in the in-memory static data: persistence only happens inside
						// `__emit` (`saveStaticData`), so the dropped call leaves the stored state
						// untouched and the newly registered poller re-fetches the same events.
						if (!testingTrigger && isSuperseded()) {
							this.logger.debug(
								`Discarding in-flight poll result for superseded workflow "${workflow.name}"`,
								{ workflowId: workflow.id },
							);
							span.setStatus({ code: SpanStatus.ok });
							return;
						}

						if (pollResponse !== null) {
							pollFunctions.__emit(pollResponse);
						}

						span.setStatus({ code: SpanStatus.ok });
					} catch (error) {
						// If the poll trigger fails in the first activation
						// throw the error back so we let the user know there is
						// an issue with the trigger.
						if (testingTrigger) {
							span.setStatus({ code: SpanStatus.error });
							throw error;
						}

						// Ignore poll errors that are against a superseded workflow
						if (isSuperseded()) {
							this.logger.debug(
								`Ignoring in-flight poll error for superseded workflow "${workflow.name}"`,
								{ workflowId: workflow.id },
							);
							span.setStatus({ code: SpanStatus.ok });
							return;
						}

						span.setStatus({ code: SpanStatus.error });
						pollFunctions.__emitError(error as Error);
					} finally {
						if (ownsIsolate) await workflow.expression.releaseIsolate();
					}
				},
			);
		};
	}

	private logTriggerActivation(workflow: Workflow, triggerNode: INode) {
		this.logger.debug(
			`Activated trigger node "${triggerNode.name}" for workflow "${workflow.name}"`,
			{
				workflow: {
					id: workflow.id,
					name: workflow.name,
				},
				node: {
					id: triggerNode.id,
					name: triggerNode.name,
					type: triggerNode.type,
				},
			},
		);
	}

	private logTriggerDeactivation(workflowId: Workflow['id'], triggerNodeId: INode['id']) {
		this.logger.debug(`Deactivated trigger "${triggerNodeId}" for workflow "${workflowId}"`, {
			workflowId,
			nodeId: triggerNodeId,
		});
	}
}
