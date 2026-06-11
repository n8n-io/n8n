import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers } from 'n8n-core';
import type {
	INode,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	WorkflowId,
} from 'n8n-workflow';

import type { TriggerFailureHandler } from '@/workflows/triggers/trigger-execution-context.factory';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { formatWorkflow } from '@/workflows/workflow.formatter';

export interface LiveTriggerRegistrationContext {
	activationMode: WorkflowActivateMode;
	executionMode: WorkflowExecuteMode;
	additionalData: IWorkflowExecuteAdditionalData;
	resolveWorkflowData: () => Promise<IWorkflowBase>;
	onTriggerFailure: TriggerFailureHandler;
}

/**
 * Registers and deregisters leader-local trigger and poll nodes in memory.
 */
@Service()
export class LiveTriggerRegistrar {
	constructor(
		private readonly logger: Logger,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Register a workflow's active, poll, and schedule triggers in memory.
	 */
	async register(
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		{
			activationMode,
			executionMode,
			additionalData,
			resolveWorkflowData,
			onTriggerFailure,
		}: LiveTriggerRegistrationContext,
		nodeIds: Set<string>,
	) {
		const triggerAndPollNodeIds = [...workflow.getTriggerNodes(), ...workflow.getPollNodes()].map(
			(node) => node.id,
		);
		const nodeIdsToAdd = triggerAndPollNodeIds.filter((id) => nodeIds.has(id));

		if (nodeIdsToAdd.length === 0) {
			return false;
		}

		const getTriggerFunctions = this.triggerExecutionContextFactory.getExecuteTriggerFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
			resolveWorkflowData,
			onTriggerFailure,
		);

		const getPollFunctions = this.triggerExecutionContextFactory.getExecutePollFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
			resolveWorkflowData,
		);

		await this.activeWorkflowTriggers.addTriggers(
			workflow.id,
			workflow,
			nodeIdsToAdd,
			additionalData,
			executionMode,
			activationMode,
			getTriggerFunctions,
			getPollFunctions,
		);

		this.logger.debug(`Added non-webhook triggers for workflow ${formatWorkflow(dbWorkflow)}`);

		return true;
	}

	async deregister(workflowId: WorkflowId, nodeIds: Set<INode['id']>) {
		await this.activeWorkflowTriggers.removeTriggers(workflowId, nodeIds);
	}
}
