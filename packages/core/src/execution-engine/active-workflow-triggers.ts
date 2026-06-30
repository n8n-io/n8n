import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	INode,
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

import type { IGetExecutePollFunctions, IGetExecuteTriggerFunctions } from './interfaces';
import { PollTriggerExecutor } from './poll-trigger-executor';
import { ScheduledTaskManager, type ScheduledTaskGroup } from './scheduled-task-manager';
import { TriggersAndPollers } from './triggers-and-pollers';
import {
	type TriggerRegistrationToken,
	WorkflowActiveTriggersState,
} from './workflow-active-triggers-state';

const WORKFLOW_SCHEDULE_GROUP_TYPE = 'workflow';

const workflowScheduleGroup = (workflowId: string): ScheduledTaskGroup => ({
	type: WORKFLOW_SCHEDULE_GROUP_TYPE,
	id: workflowId,
});

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
		private readonly pollTriggerExecutor: PollTriggerExecutor,
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
	 * for the workflow. Scheduler node ids are included defensively so publication
	 * can still see stranded crons left outside the canonical registration state.
	 */
	getRegisteredTriggerNodeIds(workflowId: string): Set<string> {
		const triggers = this.activeTriggersByWorkflowId.get(workflowId);

		return new Set([
			...this.scheduledTaskManager.getTargetIds(workflowScheduleGroup(workflowId)),
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
		const triggerFunctionNodes = workflow
			.getTriggerNodes()
			.filter((node) => nodeIdSet.has(node.id));
		const pollTriggerNodes = workflow.getPollNodes().filter((node) => nodeIdSet.has(node.id));

		if (triggerFunctionNodes.length === 0 && pollTriggerNodes.length === 0) return;

		const triggers = this.getOrCreateWorkflowTriggersState(workflowId);

		triggers.beginRegistration();
		try {
			await this.startTriggers(
				workflowId,
				workflow,
				triggerFunctionNodes,
				pollTriggerNodes,
				triggers,
				additionalData,
				mode,
				activation,
				getTriggerFunctions,
				getPollFunctions,
			);
		} finally {
			triggers.finishRegistration();
			this.deleteWorkflowIfEmpty(workflowId, triggers);
		}
	}

	private async startTriggers(
		workflowId: string,
		workflow: Workflow,
		triggerFunctionNodes: INode[],
		pollTriggerNodes: INode[],
		triggers: WorkflowActiveTriggersState,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		getPollFunctions: IGetExecutePollFunctions,
	) {
		const attemptedNodeIds = new Set<string>();
		const registeredNodeIds = new Set<string>();

		for (const triggerNode of triggerFunctionNodes) {
			attemptedNodeIds.add(triggerNode.id);

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
					triggers.addTriggerResponse(triggerNode.id, triggerResponse);
					registeredNodeIds.add(triggerNode.id);

					this.logTriggerActivation(workflow, triggerNode);
				} else if (
					this.scheduledTaskManager.hasTarget(workflowScheduleGroup(workflowId), triggerNode.id)
				) {
					triggers.addScheduledTrigger(triggerNode.id);
					registeredNodeIds.add(triggerNode.id);

					this.logTriggerActivation(workflow, triggerNode);
				}
			} catch (e) {
				const error = ensureError(e);

				// Tear down anything an earlier node already registered, so a failed
				// activation doesn't leave triggers or crons running.
				await this.rollbackPartialActivation(
					workflowId,
					triggers,
					attemptedNodeIds,
					registeredNodeIds,
				);

				throw new WorkflowActivationError(
					`There was a problem activating the workflow: "${error.message}"`,
					{ cause: error, node: triggerNode },
				);
			}
		}

		for (const pollNode of pollTriggerNodes) {
			attemptedNodeIds.add(pollNode.id);
			const token = triggers.addPoller(pollNode.id);
			registeredNodeIds.add(pollNode.id);

			try {
				await this.activatePollTrigger(
					workflowId,
					pollNode,
					workflow,
					additionalData,
					getPollFunctions,
					mode,
					activation,
					token,
				);

				this.logTriggerActivation(workflow, pollNode);
			} catch (e) {
				await this.rollbackPartialActivation(
					workflowId,
					triggers,
					attemptedNodeIds,
					registeredNodeIds,
				);

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
	 * deregisters its crons. Drops the workflow from the active set only when no
	 * trigger registrations or crons remain for it.
	 */
	async removeTriggers(workflowId: string, nodeIds: Set<INode['id']>) {
		const group = workflowScheduleGroup(workflowId);
		const activeTriggers = this.activeTriggersByWorkflowId.get(workflowId);
		if (!activeTriggers) {
			for (const nodeId of nodeIds) {
				this.scheduledTaskManager.deregisterTarget(group, nodeId);
			}
			return;
		}

		for (const nodeId of nodeIds) {
			this.scheduledTaskManager.deregisterTarget(group, nodeId);

			const response = activeTriggers.get(nodeId);
			if (response) {
				await this.closeTrigger(response, workflowId);
			}
			activeTriggers.delete(nodeId);

			this.logTriggerDeactivation(workflowId, nodeId);
		}

		this.deleteWorkflowIfEmpty(workflowId, activeTriggers);
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
		attemptedNodeIds: Iterable<string>,
		registeredNodeIds: Iterable<string>,
	) {
		const group = workflowScheduleGroup(workflowId);

		// Stop the crons first: deregistration is synchronous and is what actually
		// prevents the failed activation from continuing to fire.
		for (const nodeId of attemptedNodeIds) {
			this.scheduledTaskManager.deregisterTarget(group, nodeId);
		}

		for (const nodeId of registeredNodeIds) {
			const response = triggers.get(nodeId);
			if (!response) {
				triggers.delete(nodeId);
				continue;
			}

			try {
				await this.closeTrigger(response, workflowId);
			} catch (e) {
				this.errorReporter.error(ensureError(e), { extra: { workflowId } });
			} finally {
				triggers.delete(nodeId);
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
		token: TriggerRegistrationToken,
	): Promise<void> {
		const pollFunctions = getPollFunctions(workflow, node, additionalData, mode, activation);

		const pollTimes = pollFunctions.getNodeParameter('pollTimes') as unknown as {
			item: TriggerTime[];
		};

		// Get all the trigger times
		const cronExpressions = (pollTimes.item || []).map(toCronExpression);

		// Capture this node activation's generation; removing or replacing the node
		// invalidates only this poller, while leaving other workflow triggers intact.
		const isCurrent = () =>
			this.activeTriggersByWorkflowId.get(workflowId)?.isCurrent(node.id, token) ?? false;
		const executePollTrigger = this.pollTriggerExecutor.create(
			workflow,
			node,
			pollFunctions,
			isCurrent,
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

			this.scheduledTaskManager.register(
				{
					group: workflowScheduleGroup(workflowId),
					targetId: node.id,
					timezone: workflow.timezone,
					expression,
				},
				() => {
					void executePollTrigger();
				},
			);
		}
	}

	/**
	 * Makes a workflow inactive in memory.
	 */
	async remove(workflowId: string) {
		// Ensure crons are deregistered to prevent executions on inactive workflows
		const hadRegisteredCrons = this.scheduledTaskManager.deregisterGroup(
			workflowScheduleGroup(workflowId),
		);

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
		for (const r of triggers?.triggerResponses() ?? []) {
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
				...this.scheduledTaskManager.getGroupIds(WORKFLOW_SCHEDULE_GROUP_TYPE),
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

	private getOrCreateWorkflowTriggersState(workflowId: string) {
		const existing = this.activeTriggersByWorkflowId.get(workflowId);
		if (existing) return existing;

		const triggers = new WorkflowActiveTriggersState();
		this.activeTriggersByWorkflowId.set(workflowId, triggers);

		return triggers;
	}

	private deleteWorkflowIfEmpty(workflowId: string, triggers: WorkflowActiveTriggersState) {
		// A newer activation may have replaced the state object; only the current one can be deleted.
		if (this.activeTriggersByWorkflowId.get(workflowId) !== triggers) return;
		// Empty state is kept while another concurrent activation is still registering nodes.
		if (!triggers.isEmpty || triggers.hasPendingRegistrations) return;
		// Cron registration can outlive canonical state briefly; keep the workflow visible until cleared.
		if (this.scheduledTaskManager.hasGroup(workflowScheduleGroup(workflowId))) return;

		this.activeTriggersByWorkflowId.delete(workflowId);
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
