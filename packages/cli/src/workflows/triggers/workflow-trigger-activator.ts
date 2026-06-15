import assert from 'node:assert/strict';

import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type {
	IConnections,
	INode,
	IWebhookData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	WorkflowId,
} from 'n8n-workflow';
import { Workflow, ensureError } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { NonWebhookTriggerRegistrar } from '@/workflows/triggers/non-webhook-trigger-registrar';
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
	/** Trigger node IDs that were successfully (re)registered, in attempt order. */
	activated: Array<INode['id']>;
	/** Trigger nodes that failed to register, in attempt order. */
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
			await this.registerWebhookTriggers(workflow, additionalData, nodeIds, outcome);

			const resolveWorkflowData = this.createWorkflowDataResolver(dbWorkflow);

			await this.registerNonWebhookTriggers(
				dbWorkflow,
				workflow,
				additionalData,
				resolveWorkflowData,
				nodeIds,
				outcome,
			);

			triggerCount = this.triggerCountService.count(workflow, additionalData);
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await Promise.all([
			this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount),
			this.workflowStaticDataService.saveStaticData(workflow),
		]);

		return outcome;
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

		this.applyVersionToDbWorkflow(dbWorkflow, version);
		const workflow = this.createWorkflow(dbWorkflow);

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		const removedNodeNames = await this.deregisterWebhookTriggers(
			workflow,
			additionalData,
			nodeIds,
		);
		await this.webhookTriggerRegistrar.clearWorkflowWebhooksForNodes(
			dbWorkflow.id,
			removedNodeNames,
		);

		await this.deregisterNonWebhookTriggers(dbWorkflow.id, workflow, nodeIds);
	}

	/**
	 * Recomputes the persisted trigger count for a workflow version without
	 * registering any triggers. Used when publication only removes triggers.
	 */
	async updateTriggerCount(dbWorkflow: WorkflowEntity, version: WorkflowTriggerVersion) {
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
	 * Registers the webhook triggers of the given node set one node at a time. If a
	 * node fails to register one of its webhooks, the node is recorded as a failure
	 * but any webhooks it already registered are left in place, and the remaining
	 * nodes are still attempted. Successful nodes are added to `outcome.activated`.
	 */
	private async registerWebhookTriggers(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
		outcome: TriggerActivationOutcome,
	) {
		const webhooksByNode = this.groupWebhookTriggersByNode(workflow, additionalData, nodeIds);

		for (const [nodeId, { nodeName, webhooks }] of webhooksByNode) {
			try {
				for (const webhookData of webhooks) {
					await this.webhookTriggerRegistrar.register({
						workflow,
						webhookData,
						mode: 'trigger',
						activation: 'update',
					});
				}
				outcome.activated.push(nodeId);
			} catch (error) {
				outcome.failures.push({ nodeId, nodeName, error: ensureError(error) });
			}
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

			for (const webhookData of webhooks) {
				const nodeName = await this.webhookTriggerRegistrar.deregister({
					workflow,
					webhookData,
				});
				removedNodeNames.push(nodeName);
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
				this.reportRuntimeTriggerFailure(error, node, workflowData.id, mode, activation);
			},
		});

		for (const nodeId of triggerNodeIds) {
			try {
				await this.nonWebhookTriggerRegistrar.register(workflow, registration, nodeId);
				outcome.activated.push(nodeId);
			} catch (error) {
				outcome.failures.push({
					nodeId,
					nodeName: this.resolveNodeName(workflow, nodeId),
					error: ensureError(error),
				});
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

		for (const nodeId of triggerNodeIds) {
			await this.nonWebhookTriggerRegistrar.deregister(workflowId, nodeId);
		}
	}

	private getNonWebhookTriggerNodeIdsForNodeIds(workflow: Workflow, nodeIds: Set<INode['id']>) {
		return this.nonWebhookTriggerRegistrar
			.getTriggerNodeIds(workflow)
			.filter((nodeId) => nodeIds.has(nodeId));
	}

	private createWorkflowDataResolver(dbWorkflow: WorkflowEntity): () => Promise<IWorkflowBase> {
		return async () =>
			await this.triggerExecutionContextFactory.loadPublishedWorkflowData(dbWorkflow);
	}

	private reportRuntimeTriggerFailure(
		error: Error,
		node: INode,
		workflowId: WorkflowId,
		mode: string,
		activation: string,
	) {
		this.logger.warn('Publication trigger node reported a runtime error', {
			error,
			workflowId,
			nodeId: node.id,
			nodeName: node.name,
			mode,
			activation,
		});
		this.errorReporter.error(error, {
			extra: { workflowId, nodeId: node.id, nodeName: node.name, mode, activation },
		});
	}
}
