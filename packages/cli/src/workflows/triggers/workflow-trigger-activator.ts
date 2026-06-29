import assert from 'node:assert/strict';

import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { IWorkflowDb, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter, SpanStatus, Tracing } from 'n8n-core';
import type {
	IConnections,
	INode,
	IWebhookData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	Result,
	WorkflowActivateMode,
	WorkflowExecuteMode,
	WorkflowId,
} from 'n8n-workflow';
import {
	Workflow,
	WorkflowActivationError,
	createResultError,
	createResultOk,
	ensureError,
} from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import { TRIGGER_ACTIVATION_MAX_ATTEMPTS } from '@/constants';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import type { PreparedNonWebhookTriggerRegistration } from '@/workflows/triggers/non-webhook-trigger-registrar';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
import { retryTriggerActivation } from '@/workflows/triggers/trigger-activation-retry';
import { TriggerCountService } from '@/workflows/triggers/trigger-count.service';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

export type WorkflowTriggerVersion = { nodes: INode[]; connections: IConnections };

/** A single trigger node that failed to (de)register during activation. */
export type TriggerActivationFailure = {
	nodeId: INode['id'];
	nodeName: string;
	error: Error;
};

/**
 * The per-node result of activating a set of trigger nodes. Activation is
 * resilient: a failing node is recorded in `failures` and the remaining nodes
 * are still attempted, so surviving triggers keep running. The applier turns
 * this into a `completed`, `partial`, or `failed` publication result.
 */
export type TriggerActivationOutcome = {
	/** Trigger node IDs that were successfully (re)registered. */
	activated: Array<INode['id']>;
	/** Trigger nodes that failed to register. */
	failures: TriggerActivationFailure[];
};

/**
 * Publication-facing facade for trigger activation, deactivation, and counts.
 */
@Service()
export class WorkflowTriggerActivator {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly nodeTypes: NodeTypes,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly triggerExecutionContextFactory: TriggerExecutionContextFactory,
		private readonly webhookTriggerRegistrar: WebhookTriggerRegistrar,
		private readonly nonWebhookTriggerRegistrar: NonWebhookTriggerRegistrar,
		private readonly triggerCountService: TriggerCountService,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly tracing: Tracing,
	) {
		assert(
			this.workflowsConfig.useWorkflowPublicationService,
			'WorkflowTriggerActivator requires workflow publication service to be enabled',
		);
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Returns the enabled trigger-like nodes (active, poll, schedule and webhook
	 * triggers) of a workflow version. Disabled nodes are excluded, so the result
	 * is the set of nodes that actually drive trigger registration. Used to
	 * compute the trigger-level diff during publication.
	 */
	getEnabledTriggerNodes(version: WorkflowTriggerVersion | null): INode[] {
		if (!version) return [];

		const workflow = new Workflow({
			id: 'trigger-diff',
			name: 'trigger-diff',
			nodes: version.nodes,
			connections: version.connections,
			active: false,
			nodeTypes: this.nodeTypes,
		});

		return workflow.queryNodes(
			(nodeType) => !!nodeType.trigger || !!nodeType.poll || !!nodeType.webhook,
		);
	}

	/**
	 * Returns the desired non-webhook trigger nodes (active, schedule and poll
	 * triggers) that are not currently registered in memory for the workflow.
	 * Webhook triggers are excluded because they live in the `webhook_entity`
	 * table rather than the in-memory registry. `desiredNodes` are the enabled
	 * trigger-like nodes of the version being published.
	 *
	 * This is how publication reconciles a record ("be at version X") against
	 * actual local state: a re-enqueued version whose non-webhook triggers were
	 * never (or only partly) registered yields exactly the missing nodes to add.
	 */
	getUnregisteredNonWebhookTriggerNodeIds(
		workflowId: WorkflowId,
		desiredNodes: INode[],
	): Set<INode['id']> {
		const registered = this.nonWebhookTriggerRegistrar.getRegisteredTriggerNodeIds(workflowId);

		const unregistered = new Set<INode['id']>();
		for (const nodeId of this.getNonWebhookTriggerNodeIds(desiredNodes)) {
			if (!registered.has(nodeId)) unregistered.add(nodeId);
		}

		return unregistered;
	}

	/**
	 * Returns the desired webhook trigger nodes of the given version whose webhooks
	 * are not all registered in storage (the `webhook_entity` table). The webhook
	 * counterpart to {@link getUnregisteredNonWebhookTriggerNodeIds}: it lets
	 * publication reconcile a re-enqueued version whose webhooks were never (or only
	 * partly) registered, e.g. after a crash that advanced the published version.
	 */
	async getNodesWithUnregisteredWebhooks(
		dbWorkflow: WorkflowEntity,
		version: WorkflowTriggerVersion,
	): Promise<Set<INode['id']>> {
		const desiredNodes = new Set(this.getEnabledTriggerNodes(version).map((node) => node.id));
		if (desiredNodes.size === 0) return new Set();

		this.applyVersionToDbWorkflow(dbWorkflow, version);
		const workflow = this.createWorkflow(dbWorkflow);

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		return await this.webhookTriggerRegistrar.getNodesWithUnregisteredWebhooks(
			workflow,
			additionalData,
			desiredNodes,
		);
	}

	/**
	 * Filters the given nodes to the non-webhook trigger nodes (active, schedule
	 * and poll triggers), matching the registration logic in
	 * `NonWebhookTriggerRegistrar`.
	 */
	private getNonWebhookTriggerNodeIds(nodes: INode[]): string[] {
		const workflow = new Workflow({
			id: 'trigger-diff',
			name: 'trigger-diff',
			nodes,
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		return [...workflow.getTriggerNodes(), ...workflow.getPollNodes()].map((node) => node.id);
	}

	/**
	 * Registers only the given trigger nodes (webhook and non-webhook) of the
	 * given workflow version, leaving any other already-active triggers
	 * untouched. The "add" side of a publication trigger diff; runs on the leader
	 * after the published version has been advanced.
	 *
	 * Activation is per-node resilient: a node that fails to register is recorded
	 * in the returned outcome's `failures` and the remaining nodes are still
	 * attempted, so a single broken trigger does not prevent the others from
	 * running. The caller decides whether the result is a full or partial success.
	 */
	async activate(
		dbWorkflow: WorkflowEntity,
		version: WorkflowTriggerVersion,
		nodeIds: Set<INode['id']>,
	): Promise<TriggerActivationOutcome> {
		return await this.tracing.startSpan(
			{
				name: 'Trigger activation',
				op: 'publication.trigger.activate',
				attributes: {
					...this.tracing.pickWorkflowAttributes(dbWorkflow),
					'n8n.publication.nodes_requested': nodeIds.size,
				},
			},
			async (span) => {
				this.applyVersionToDbWorkflow(dbWorkflow, version);
				const workflow = this.createWorkflow(dbWorkflow);

				const additionalData = await WorkflowExecuteAdditionalData.getBase({
					workflowId: workflow.id,
					workflowSettings: dbWorkflow.settings,
				});

				const outcome: TriggerActivationOutcome = { activated: [], failures: [] };

				let triggerCount = 0;
				await workflow.expression.acquireIsolate();
				try {
					const resolveWorkflowData = this.createWorkflowDataResolver(dbWorkflow);

					// The two phases share the single isolate acquired here and mutate
					// `outcome` via synchronous pushes, so overlapping them is safe.
					const phaseResults = await Promise.allSettled([
						this.registerWebhookTriggers(workflow, additionalData, nodeIds, outcome),
						this.registerNonWebhookTriggers(
							dbWorkflow,
							workflow,
							additionalData,
							resolveWorkflowData,
							nodeIds,
							outcome,
						),
					]);
					this.throwRejectedPhaseError(phaseResults);

					triggerCount = this.triggerCountService.count(workflow, additionalData);
				} finally {
					await workflow.expression.releaseIsolate();
				}

				await Promise.all([
					this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount),
					this.workflowStaticDataService.saveStaticData(workflow),
				]);

				span.setAttributes({
					'n8n.publication.nodes_activated': outcome.activated.length,
					'n8n.publication.nodes_failed': outcome.failures.length,
					'n8n.publication.trigger_count': triggerCount,
				});
				span.setStatus({ code: SpanStatus.ok });

				return outcome;
			},
		);
	}

	/**
	 * Deregisters only the given trigger nodes (webhook and non-webhook) of the
	 * given workflow version, leaving the rest active. The caller passes the
	 * currently published version so the right webhooks are deregistered.
	 */
	async deactivate(
		dbWorkflow: WorkflowEntity,
		version: WorkflowTriggerVersion,
		nodeIds: Set<INode['id']>,
	) {
		if (nodeIds.size === 0) return;

		await this.tracing.startSpan(
			{
				name: 'Trigger deactivation',
				op: 'publication.trigger.deactivate',
				attributes: {
					...this.tracing.pickWorkflowAttributes(dbWorkflow),
					'n8n.publication.nodes_requested': nodeIds.size,
				},
			},
			async (span) => {
				this.applyVersionToDbWorkflow(dbWorkflow, version);
				const workflow = this.createWorkflow(dbWorkflow);

				const additionalData = await WorkflowExecuteAdditionalData.getBase({
					workflowId: workflow.id,
					workflowSettings: dbWorkflow.settings,
				});

				// The non-webhook phase doesn't touch the expression isolate that the
				// webhook deregister acquires, so the two phases can overlap.
				const phaseResults = await Promise.allSettled([
					this.deregisterWebhookTriggers(workflow, additionalData, nodeIds).then(
						async (removedNodeNames) =>
							await this.webhookTriggerRegistrar.clearWorkflowWebhooksForNodes(
								dbWorkflow.id,
								removedNodeNames,
							),
					),
					this.deregisterNonWebhookTriggers(dbWorkflow.id, workflow, nodeIds),
				]);
				this.throwRejectedPhaseError(phaseResults);

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	/**
	 * Recomputes the persisted trigger count for a workflow version without
	 * registering any triggers. Used when publication only removes triggers.
	 */
	async updateTriggerCount(dbWorkflow: WorkflowEntity, version: WorkflowTriggerVersion) {
		await this.tracing.startSpan(
			{
				name: 'Trigger count update',
				op: 'publication.trigger.update_count',
				attributes: this.tracing.pickWorkflowAttributes(dbWorkflow),
			},
			async (span) => {
				this.applyVersionToDbWorkflow(dbWorkflow, version);
				const workflow = this.createWorkflow(dbWorkflow);

				const additionalData = await WorkflowExecuteAdditionalData.getBase({
					workflowId: workflow.id,
					workflowSettings: dbWorkflow.settings,
				});

				let triggerCount = 0;
				await workflow.expression.acquireIsolate();
				try {
					triggerCount = this.triggerCountService.count(workflow, additionalData);
				} finally {
					await workflow.expression.releaseIsolate();
				}

				await this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount);

				span.setAttribute('n8n.publication.trigger_count', triggerCount);
				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	private applyVersionToDbWorkflow(dbWorkflow: WorkflowEntity, version: WorkflowTriggerVersion) {
		// TODO: Remove this mutation once trigger registration accepts immutable version data.
		dbWorkflow.nodes = version.nodes;
		dbWorkflow.connections = version.connections;
	}

	private createWorkflow(dbWorkflow: WorkflowEntity) {
		return new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: dbWorkflow.nodes,
			connections: dbWorkflow.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});
	}

	/**
	 * Registers the webhook triggers of the given node set, fanning out across
	 * nodes. Each node's own webhooks are registered sequentially (retrying
	 * transient failures per webhook); a node that fails to register one of its
	 * webhooks is recorded as a failure with any already-registered webhooks left
	 * in place, and the other nodes are unaffected. Successful nodes are added to
	 * `outcome.activated`.
	 */
	private async registerWebhookTriggers(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
		outcome: TriggerActivationOutcome,
	) {
		const webhooksByNode = this.groupWebhookTriggersByNode(workflow, additionalData, nodeIds);

		const tasks = [...webhooksByNode].map(
			async ([nodeId, { nodeName, webhooks }]) =>
				await this.registerWebhookTriggersForNode(workflow, nodeId, nodeName, webhooks),
		);

		for (const result of await Promise.all(tasks)) {
			if (result.ok) outcome.activated.push(result.result.nodeId);
			else outcome.failures.push(result.error);
		}
	}

	/**
	 * Registers a single node's webhooks sequentially, retrying transient failures
	 * per webhook, and returns a discriminated result so the parallel fan-out can
	 * partition nodes into successes and failures.
	 */
	private async registerWebhookTriggersForNode(
		workflow: Workflow,
		nodeId: INode['id'],
		nodeName: string,
		webhooks: IWebhookData[],
	): Promise<Result<{ nodeId: INode['id'] }, TriggerActivationFailure>> {
		try {
			for (const webhookData of webhooks) {
				await retryTriggerActivation(
					async () =>
						await this.webhookTriggerRegistrar.register({
							workflow,
							webhookData,
							mode: 'trigger',
							activation: 'update',
						}),
					TRIGGER_ACTIVATION_MAX_ATTEMPTS,
				);
			}
			return createResultOk({ nodeId });
		} catch (error) {
			return createResultError({ nodeId, nodeName, error: ensureError(error) });
		}
	}

	/**
	 * Groups the webhook triggers of the given node set by node, so each node's
	 * webhooks can be registered (and rolled back) atomically. Keyed by node id;
	 * the node name is captured for failure reporting.
	 */
	private groupWebhookTriggersByNode(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
	) {
		const grouped = new Map<INode['id'], { nodeName: string; webhooks: IWebhookData[] }>();

		for (const webhookData of this.getWebhookTriggersForNodeIds(
			workflow,
			additionalData,
			nodeIds,
		)) {
			const nodeId = workflow.getNode(webhookData.node)?.id;
			if (!nodeId) continue;

			const entry = grouped.get(nodeId) ?? { nodeName: webhookData.node, webhooks: [] };
			entry.webhooks.push(webhookData);
			grouped.set(nodeId, entry);
		}

		return grouped;
	}

	private async deregisterWebhookTriggers(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
	) {
		const removedNodeNames: string[] = [];

		await workflow.expression.acquireIsolate();
		try {
			const webhooks = this.getWebhookTriggersForNodeIds(workflow, additionalData, nodeIds);

			const deregistrationResults = await Promise.allSettled(
				webhooks.map(
					async (webhookData) =>
						await this.webhookTriggerRegistrar.deregister({ workflow, webhookData }),
				),
			);

			for (const result of deregistrationResults) {
				if (result.status === 'rejected') throw ensureError(result.reason);
				removedNodeNames.push(result.value);
			}
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		return removedNodeNames;
	}

	private getWebhookTriggersForNodeIds(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
	) {
		return this.webhookTriggerRegistrar
			.getWebhookTriggers(workflow, additionalData)
			.filter((webhookData) => nodeIds.has(workflow.getNode(webhookData.node)?.id ?? ''));
	}

	/**
	 * Registers the non-webhook triggers of the given node set one node at a time.
	 * Each `register` is a single-node `addTriggers` call, so core's existing
	 * rollback gives per-node atomicity: a node that fails to register is recorded
	 * as a failure and the remaining nodes are still attempted. Successful nodes
	 * are added to `outcome.activated`.
	 */
	private async registerNonWebhookTriggers(
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		resolveWorkflowData: () => Promise<IWorkflowBase>,
		nodeIds: Set<INode['id']>,
		outcome: TriggerActivationOutcome,
	) {
		const triggerNodeIds = this.getNonWebhookTriggerNodeIdsForNodeIds(workflow, nodeIds);
		if (triggerNodeIds.length === 0) return;

		const registration = this.nonWebhookTriggerRegistrar.createRegistrationContext(dbWorkflow, {
			activationMode: 'update',
			executionMode: 'trigger',
			additionalData,
			resolveWorkflowData,
			onTriggerFailure: ({ error, node, workflowData, mode, activation }) => {
				void this.recoverFromRuntimeTriggerFailure({
					error,
					node,
					workflow,
					workflowData,
					registration,
					mode,
					activation,
				});
			},
		});

		const results = await Promise.all(
			triggerNodeIds.map(async (nodeId): Promise<Result<INode['id'], TriggerActivationFailure>> => {
				try {
					await retryTriggerActivation(
						async () =>
							await this.nonWebhookTriggerRegistrar.register(workflow, registration, nodeId),
						TRIGGER_ACTIVATION_MAX_ATTEMPTS,
					);

					return createResultOk(nodeId);
				} catch (error) {
					return createResultError({
						nodeId,
						nodeName: this.resolveNodeName(workflow, nodeId),
						error: ensureError(error),
					});
				}
			}),
		);

		for (const result of results) {
			if (result.ok) {
				outcome.activated.push(result.result);
			} else {
				outcome.failures.push(result.error);
			}
		}
	}

	/** Resolves a node's name from its id, falling back to the id when unknown. */
	private resolveNodeName(workflow: Workflow, nodeId: INode['id']): string {
		for (const node of Object.values(workflow.nodes)) {
			if (node.id === nodeId) return node.name;
		}
		return nodeId;
	}

	private async deregisterNonWebhookTriggers(
		workflowId: WorkflowId,
		workflow: Workflow,
		nodeIds: Set<INode['id']>,
	) {
		const triggerNodeIds = this.getNonWebhookTriggerNodeIdsForNodeIds(workflow, nodeIds);

		await Promise.all(
			triggerNodeIds.map(
				async (nodeId) => await this.nonWebhookTriggerRegistrar.deregister(workflowId, nodeId),
			),
		);
	}

	private getNonWebhookTriggerNodeIdsForNodeIds(workflow: Workflow, nodeIds: Set<INode['id']>) {
		return this.nonWebhookTriggerRegistrar
			.getTriggerNodeIds(workflow)
			.filter((nodeId) => nodeIds.has(nodeId));
	}

	private createWorkflowDataResolver(dbWorkflow: WorkflowEntity): () => Promise<IWorkflowBase> {
		return async () =>
			await this.triggerExecutionContextFactory.loadPublishedWorkflowData(dbWorkflow.id);
	}

	private throwRejectedPhaseError(results: Array<PromiseSettledResult<unknown>>): void {
		const rejected = results.find((result) => result.status === 'rejected');
		if (rejected) throw ensureError(rejected.reason);
	}

	/**
	 * Recovers in-process from a runtime failure of an active trigger node, scoped
	 * to the single failed node: tear it down, surface the activation error, run
	 * the error workflow, then re-activate it with the activation backoff. The
	 * error is cleared once the node is running again, or left surfaced if
	 * reactivation gives up. Fired with `void`, so it owns its error handling.
	 */
	private async recoverFromRuntimeTriggerFailure({
		error,
		node,
		workflow,
		workflowData,
		registration,
		mode,
		activation,
	}: {
		error: Error;
		node: INode;
		workflow: Workflow;
		workflowData: IWorkflowDb;
		registration: PreparedNonWebhookTriggerRegistration;
		mode: WorkflowExecuteMode;
		activation: WorkflowActivateMode;
	}): Promise<void> {
		const workflowId = workflow.id;

		const activationError = new WorkflowActivationError(
			`The trigger node "${node.name}" failed at runtime and was deactivated`,
			{ cause: error, node, level: 'warning' },
		);
		this.errorReporter.warn(activationError, {
			extra: { workflowId, nodeId: node.id, nodeName: node.name, mode, activation },
			shouldBeLogged: true,
		});

		try {
			await this.nonWebhookTriggerRegistrar.deregister(workflowId, node.id);

			await this.activationErrorsService.register(workflowId, error.message);

			this.triggerExecutionContextFactory.executeErrorWorkflow(activationError, workflowData, mode);

			// `addTriggers` does not own the expression isolate, so acquire it per attempt.
			await retryTriggerActivation(async () => {
				await workflow.expression.acquireIsolate();
				try {
					await this.nonWebhookTriggerRegistrar.register(workflow, registration, node.id);
				} finally {
					await workflow.expression.releaseIsolate();
				}
			}, TRIGGER_ACTIVATION_MAX_ATTEMPTS);

			await this.workflowStaticDataService.saveStaticData(workflow);

			await this.activationErrorsService.deregister(workflowId);
		} catch (e) {
			const reactivationError = ensureError(e);
			this.logger.error(
				`Failed to reactivate trigger node "${node.name}" of workflow "${workflowData.name}" after a runtime failure`,
				{ workflowId, nodeId: node.id, nodeName: node.name, error: reactivationError },
			);
			this.errorReporter.error(reactivationError, {
				extra: { workflowId, nodeId: node.id, nodeName: node.name },
			});
		}
	}
}
