import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IConnections, INode, IWorkflowBase, WorkflowId } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';

import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { LiveTriggerRegistrar } from '@/workflows/triggers/live-trigger-registrar';
import { TriggerCountService } from '@/workflows/triggers/trigger-count.service';
import { TriggerExecutionContextFactory } from '@/workflows/triggers/trigger-execution-context.factory';
import { WebhookTriggerRegistrar } from '@/workflows/triggers/webhook-trigger-registrar';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';
import { NodeTypes } from '@/node-types';

export type WorkflowTriggerVersion = { nodes: INode[]; connections: IConnections };

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
		private readonly liveTriggerRegistrar: LiveTriggerRegistrar,
		private readonly triggerCountService: TriggerCountService,
	) {
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
		const workflow = this.createWorkflow(dbWorkflow, version);

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		let triggerCount = 0;
		await workflow.expression.acquireIsolate();
		try {
			await this.webhookTriggerRegistrar.register({
				workflow,
				additionalData,
				mode: 'trigger',
				activation: 'update',
				nodeIds,
			});

			const resolveWorkflowData = this.createWorkflowDataResolver(dbWorkflow);

			await this.liveTriggerRegistrar.register(
				dbWorkflow,
				workflow,
				{
					activationMode: 'update',
					executionMode: 'trigger',
					additionalData,
					resolveWorkflowData,
					onTriggerFailure: ({ error, node, workflowData, mode, activation }) => {
						this.reportRuntimeTriggerFailure(error, node, workflowData.id, mode, activation);
					},
				},
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

		const workflow = this.createWorkflow(dbWorkflow, version);

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId: workflow.id,
			workflowSettings: dbWorkflow.settings,
		});

		const removedNodeNames = await this.webhookTriggerRegistrar.deregister(
			workflow,
			additionalData,
			nodeIds,
		);
		await this.webhookTriggerRegistrar.clearWorkflowWebhooksForNodes(dbWorkflow.id, removedNodeNames);

		await this.liveTriggerRegistrar.deregister(dbWorkflow.id, nodeIds);
	}

	/**
	 * Recomputes the persisted trigger count for a workflow version without
	 * registering any triggers. Used when publication only removes triggers.
	 */
	async updateTriggerCount(dbWorkflow: WorkflowEntity, version: WorkflowTriggerVersion) {
		const workflow = this.createWorkflow(dbWorkflow, version);

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

	private createWorkflow(dbWorkflow: WorkflowEntity, version: WorkflowTriggerVersion) {
		dbWorkflow.nodes = version.nodes;
		dbWorkflow.connections = version.connections;

		return new Workflow({
			id: dbWorkflow.id,
			name: dbWorkflow.name,
			nodes: version.nodes,
			connections: version.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});
	}

	private createWorkflowDataResolver(dbWorkflow: WorkflowEntity): () => Promise<IWorkflowBase> {
		if (this.workflowsConfig.useWorkflowPublicationService) {
			return async () =>
				await this.triggerExecutionContextFactory.loadPublishedWorkflowData(dbWorkflow);
		}

		return async () => dbWorkflow as IWorkflowBase;
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
