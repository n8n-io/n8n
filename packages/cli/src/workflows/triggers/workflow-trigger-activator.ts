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
	 */
	async activate(
		dbWorkflow: WorkflowEntity,
		version: WorkflowTriggerVersion,
		nodeIds: Set<INode['id']>,
	) {
		this.applyVersionToDbWorkflow(dbWorkflow, version);
		const workflow = this.createWorkflow(dbWorkflow);

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		let triggerCount = 0;
		await workflow.expression.acquireIsolate();
		try {
			await this.registerWebhookTriggers(workflow, additionalData, nodeIds);

			const resolveWorkflowData = this.createWorkflowDataResolver(dbWorkflow);

			await this.registerNonWebhookTriggers(
				dbWorkflow,
				workflow,
				additionalData,
				resolveWorkflowData,
				nodeIds,
			);

			triggerCount = this.triggerCountService.count(workflow, additionalData);
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await Promise.all([
			this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount),
			this.workflowStaticDataService.saveStaticData(workflow),
		]);
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

	private async registerWebhookTriggers(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
	) {
		const webhooks = this.getWebhookTriggersForNodeIds(workflow, additionalData, nodeIds);
		const registeredWebhooks: IWebhookData[] = [];

		try {
			for (const webhookData of webhooks) {
				await this.webhookTriggerRegistrar.register({
					workflow,
					webhookData,
					mode: 'trigger',
					activation: 'update',
				});
				registeredWebhooks.push(webhookData);
			}
		} catch (error) {
			await this.clearRegisteredWebhookTriggers(workflow, registeredWebhooks);
			throw error;
		}
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

	private async clearRegisteredWebhookTriggers(workflow: Workflow, webhooks: IWebhookData[]) {
		if (webhooks.length === 0) return;

		try {
			const removedNodeNames: string[] = [];

			for (const webhookData of webhooks) {
				const nodeName = await this.webhookTriggerRegistrar.deregister({
					workflow,
					webhookData,
				});
				removedNodeNames.push(nodeName);
			}

			await this.workflowStaticDataService.saveStaticData(workflow);

			await this.webhookTriggerRegistrar.clearWorkflowWebhooksForNodes(
				workflow.id,
				removedNodeNames,
			);
		} catch (clearError) {
			const error = ensureError(clearError);
			this.errorReporter.error(error);
			this.logger.error(
				`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error.message}"`,
			);
		}
	}

	private async registerNonWebhookTriggers(
		dbWorkflow: WorkflowEntity,
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		resolveWorkflowData: () => Promise<IWorkflowBase>,
		nodeIds: Set<INode['id']>,
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
			await this.nonWebhookTriggerRegistrar.register(workflow, registration, nodeId);
		}
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
