import { Logger } from '@n8n/backend-common';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
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
import { PollTriggerJobRegistrar } from '@/scheduling/poll-trigger-node/poll-trigger-job-registrar';
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
		private readonly pollTriggerJobRegistrar: PollTriggerJobRegistrar,
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
	 * Deregister one active, poll, or schedule trigger node from memory, and drop
	 * the durable jobs it provisioned.
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
				// The durable rows are database state the node no longer owns, and a close
				// function that never settles is abandoned by the caller rather than
				// retried, so their removal must not wait on the in-memory teardown.
				const [inMemory, durable] = await Promise.allSettled([
					this.activeWorkflowTriggers.removeTriggers(workflowId, new Set([nodeId])),
					this.removeDurableJobs(workflowId, nodeId),
				]);

				// A durable failure wins: it must reach the caller for retry, while an
				// in-memory failure may be abandoned as permanent. Log the in-memory
				// failure the throw would otherwise swallow.
				if (durable.status === 'rejected') {
					if (inMemory.status === 'rejected') {
						this.logger.error('Failed to deregister a trigger node from memory', {
							workflowId,
							nodeId,
							error: ensureError(inMemory.reason),
						});
					}
					throw ensureError(durable.reason);
				}
				if (inMemory.status === 'rejected') {
					throw ensureError(inMemory.reason);
				}

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	private async removeDurableJobs(workflowId: WorkflowId, nodeId: INode['id']) {
		await this.scheduleTriggerJobRegistrar.remove(workflowId, nodeId);
		await this.pollTriggerJobRegistrar.remove(workflowId, nodeId);
	}
}
