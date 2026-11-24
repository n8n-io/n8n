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
	 * the durable jobs it provisioned. When a durable removal failure propagates
	 * while the in-memory teardown is still pending, that teardown is handed to
	 * `onDetached`: it may still mutate the registry when it settles, so the
	 * caller must not release the workflow's lifecycle lock until it does.
	 */
	async deregister(
		workflowId: WorkflowId,
		nodeId: INode['id'],
		onDetached?: (work: Promise<unknown>) => void,
	) {
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
				// Start the in-memory teardown now, but await it only after the durable
				// removal below. The durable rows are database state the node no longer
				// owns, so a durable failure must reach the caller for a retry even when
				// the in-memory teardown never settles.
				const inMemory = this.activeWorkflowTriggers.removeTriggers(workflowId, new Set([nodeId]));
				// Logs an in-memory failure a durable failure would otherwise swallow, and
				// keeps its rejection handled while the durable removal is awaited first.
				void inMemory.catch((error: unknown) => {
					this.logger.error('Failed to deregister a trigger node from memory', {
						workflowId,
						nodeId,
						error: ensureError(error),
					});
				});

				try {
					await this.removeDurableJobs(workflowId, nodeId);
				} catch (error) {
					// The in-memory teardown may still be pending, so hand it back before
					// this failure lets the caller release the lifecycle lock.
					onDetached?.(inMemory);
					throw ensureError(error);
				}

				try {
					await inMemory;
				} catch (error) {
					throw ensureError(error);
				}

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	private async removeDurableJobs(workflowId: WorkflowId, nodeId: INode['id']) {
		const results = await Promise.allSettled([
			this.scheduleTriggerJobRegistrar.remove(workflowId, nodeId),
			this.pollTriggerJobRegistrar.remove(workflowId, nodeId),
		]);
		const failure = results.find(
			(result): result is PromiseRejectedResult => result.status === 'rejected',
		);
		if (failure) {
			throw ensureError(failure.reason);
		}
	}
}
