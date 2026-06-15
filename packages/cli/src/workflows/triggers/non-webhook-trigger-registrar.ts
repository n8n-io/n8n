import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	ActiveWorkflowTriggers,
	type IGetExecutePollFunctions,
	type IGetExecuteTriggerFunctions,
} from 'n8n-core';
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

export interface NonWebhookTriggerRegistrationContext {
	activationMode: WorkflowActivateMode;
	executionMode: WorkflowExecuteMode;
	additionalData: IWorkflowExecuteAdditionalData;
	resolveWorkflowData: () => Promise<IWorkflowBase>;
	onTriggerFailure: TriggerFailureHandler;
}

export interface PreparedNonWebhookTriggerRegistration {
	dbWorkflow: WorkflowEntity;
	activationMode: WorkflowActivateMode;
	executionMode: WorkflowExecuteMode;
	additionalData: IWorkflowExecuteAdditionalData;
	getTriggerFunctions: IGetExecuteTriggerFunctions;
	getPollFunctions: IGetExecutePollFunctions;
}

/**
 * Registers and deregisters leader-local trigger and poll nodes in memory.
 */
@Service()
export class NonWebhookTriggerRegistrar {
	constructor(
		private readonly logger: Logger,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Resolve active, poll, and schedule trigger node IDs.
	 */
	getTriggerNodeIds(workflow: Workflow) {
		return [...workflow.getTriggerNodes(), ...workflow.getPollNodes()].map((node) => node.id);
	}

	/**
	 * Resolve the IDs of the active, poll, and schedule trigger nodes currently
	 * registered in memory for the workflow.
	 */
	getRegisteredTriggerNodeIds(workflowId: WorkflowId) {
		return this.activeWorkflowTriggers.getRegisteredTriggerNodeIds(workflowId);
	}

	/**
	 * Build reusable trigger and poll execution functions for one activation.
	 */
	createRegistrationContext(
		dbWorkflow: WorkflowEntity,
		{
			activationMode,
			executionMode,
			additionalData,
			resolveWorkflowData,
			onTriggerFailure,
		}: NonWebhookTriggerRegistrationContext,
	) {
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

		return {
			dbWorkflow,
			activationMode,
			executionMode,
			additionalData,
			getTriggerFunctions,
			getPollFunctions,
		};
	}

	/**
	 * Register one active, poll, or schedule trigger node in memory.
	 */
	async register(
		workflow: Workflow,
		{
			dbWorkflow,
			activationMode,
			executionMode,
			additionalData,
			getTriggerFunctions,
			getPollFunctions,
		}: PreparedNonWebhookTriggerRegistration,
		nodeId: INode['id'],
	) {
		await this.activeWorkflowTriggers.addTriggers(
			workflow.id,
			workflow,
			[nodeId],
			additionalData,
			executionMode,
			activationMode,
			getTriggerFunctions,
			getPollFunctions,
		);

		this.logger.debug(
			`Added non-webhook trigger "${nodeId}" for workflow ${formatWorkflow(dbWorkflow)}`,
		);
	}

	/**
	 * Deregister one active, poll, or schedule trigger node from memory.
	 */
	async deregister(workflowId: WorkflowId, nodeId: INode['id']) {
		await this.activeWorkflowTriggers.removeTriggers(workflowId, new Set([nodeId]));
	}
}
