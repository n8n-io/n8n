import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	ActiveWorkflowTriggers,
	SpanStatus,
	Tracing,
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

import type { ScheduleTriggerCollectionSession } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import { ScheduleTriggerJobRegistrar } from '@/scheduling/schedule-trigger-node/schedule-trigger-job-registrar';
import type { TriggerFailureHandler } from '@/workflows/triggers/trigger-execution-context.factory';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';

export interface NonWebhookTriggerRegistrationContext {
	activationMode: WorkflowActivateMode;
	executionMode: WorkflowExecuteMode;
	additionalData: IWorkflowExecuteAdditionalData;
	resolveWorkflowData: () => Promise<IWorkflowBase>;
	onTriggerFailure: TriggerFailureHandler;
}

export interface PreparedNonWebhookTriggerRegistration {
	activationMode: WorkflowActivateMode;
	executionMode: WorkflowExecuteMode;
	additionalData: IWorkflowExecuteAdditionalData;
	getTriggerFunctions: IGetExecuteTriggerFunctions;
	getPollFunctions: IGetExecutePollFunctions;
	/** This activation attempt's rule collection, committed or discarded per node by {@link NonWebhookTriggerRegistrar.register}. */
	scheduleCollectionSession: ScheduleTriggerCollectionSession;
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
		private readonly scheduleTriggerJobRegistrar: ScheduleTriggerJobRegistrar,
		private readonly tracing: Tracing,
	) {
		this.logger = this.logger.scoped('workflow-publication');
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
		const scheduleCollectionSession = this.scheduleTriggerJobRegistrar.createSession();

		const getTriggerFunctions = this.triggerExecutionContextFactory.getExecuteTriggerFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
			resolveWorkflowData,
			onTriggerFailure,
			scheduleCollectionSession,
		);

		const getPollFunctions = this.triggerExecutionContextFactory.getExecutePollFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
			resolveWorkflowData,
		);

		return {
			activationMode,
			executionMode,
			additionalData,
			getTriggerFunctions,
			getPollFunctions,
			scheduleCollectionSession,
		};
	}

	/**
	 * Register one active, poll, or schedule trigger node in memory.
	 */
	async register(
		workflow: Workflow,
		{
			activationMode,
			executionMode,
			additionalData,
			getTriggerFunctions,
			getPollFunctions,
			scheduleCollectionSession,
		}: PreparedNonWebhookTriggerRegistration,
		nodeId: INode['id'],
	) {
		await this.tracing.startSpan(
			{
				name: 'Non-webhook trigger register',
				op: 'publication.non_webhook.register',
				attributes: {
					...this.tracing.pickWorkflowAttributes({ id: workflow.id, name: workflow.name }),
					...this.tracing.pickNodeAttributes({ id: nodeId }),
					'n8n.publication.activation_mode': activationMode,
					'n8n.publication.execution_mode': executionMode,
				},
			},
			async (span) => {
				try {
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
					await scheduleCollectionSession.commit(workflow.id, nodeId);
				} finally {
					scheduleCollectionSession.discard(workflow.id, nodeId);
				}

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	/**
	 * Deregister one active, poll, or schedule trigger node from memory.
	 */
	async deregister(workflowId: WorkflowId, nodeId: INode['id']) {
		await this.tracing.startSpan(
			{
				name: 'Non-webhook trigger deregister',
				op: 'publication.non_webhook.deregister',
				attributes: {
					...this.tracing.pickWorkflowAttributes({ id: workflowId }),
					...this.tracing.pickNodeAttributes({ id: nodeId }),
				},
			},
			async (span) => {
				await this.activeWorkflowTriggers.removeTriggers(workflowId, new Set([nodeId]));
				await this.scheduleTriggerJobRegistrar.remove(workflowId, nodeId);

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}
}
