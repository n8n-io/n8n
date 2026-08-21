import type { WorkflowEntity } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Get, GlobalScope, Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import get from 'lodash/get';
import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { getTriggerKinds } from '@/workflows/triggers/trigger-kinds';

import * as WebhookHelpers from './webhook-helpers';
import { WebhookService } from './webhook.service';
import type { Method } from './webhook.types';

type TriggerRow = {
	kind: 'webhook' | 'trigger';
	workflowId: string;
	workflowName?: string;
	method?: string;
	path?: string;
	node: string;
	nodeType?: string;
	isActive: boolean;
};

@RestController('/webhooks')
export class WebhooksController {
	constructor(
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	@Get('/')
	@GlobalScope('webhook:list')
	async getAll() {
		const rows = [
			...(await this.getActiveWebhooks()),
			...(await this.getActiveInMemoryTriggers()),
			...(await this.getInactiveTriggers()),
		];
		if (rows.length === 0) return rows;

		const workflowIds = [...new Set(rows.map((row) => row.workflowId))];
		const ownerProjects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		return rows.map((row) => {
			const project = ownerProjects.get(row.workflowId);
			return {
				...row,
				project: project
					? { name: project.name, type: project.type, icon: project.icon }
					: undefined,
			};
		});
	}

	private async getActiveWebhooks(): Promise<TriggerRow[]> {
		const registered = await this.webhookService.findAll();
		const workflowIds = [...new Set(registered.map((webhook) => webhook.workflowId))];
		const workflows = await this.workflowRepository.findByIds(workflowIds, {
			fields: ['id', 'name', 'nodes'],
		});
		const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

		return registered.map((webhook) => {
			const workflow = workflowsById.get(webhook.workflowId);
			return {
				kind: 'webhook',
				workflowId: webhook.workflowId,
				workflowName: workflow?.name,
				method: webhook.method,
				// Dynamic paths are served under the node's webhookId prefix
				path: webhook.isDynamic
					? `${webhook.webhookId}/${webhook.webhookPath}`
					: webhook.webhookPath,
				node: webhook.node,
				nodeType: workflow?.nodes.find((node) => node.name === webhook.node)?.type,
				isActive: true,
			};
		});
	}

	/** Schedule/polling triggers registered by published workflows. */
	private async getActiveInMemoryTriggers(): Promise<TriggerRow[]> {
		const workflows = await this.workflowRepository.findPublishedWithActiveVersionNodes();
		return workflows.flatMap((workflow) =>
			this.buildInMemoryTriggerRows(
				workflow.id,
				workflow.name,
				workflow.activeVersion?.nodes ?? [],
				true,
			),
		);
	}

	/**
	 * Triggers defined in unpublished workflows. Webhooks are resolved with the
	 * same helper the activation flow uses so paths match what would be
	 * registered; in-memory triggers (schedules, pollers) are listed directly.
	 */
	private async getInactiveTriggers(): Promise<TriggerRow[]> {
		// ponytail: loads nodes of every unpublished workflow; filter in SQL if this gets slow
		const workflowEntities = await this.workflowRepository.findUnpublishedWithNodes();

		const rows: TriggerRow[] = [];
		let additionalData: IWorkflowExecuteAdditionalData | undefined;
		for (const entity of workflowEntities) {
			rows.push(...this.buildInMemoryTriggerRows(entity.id, entity.name, entity.nodes, false));

			if (entity.nodes.some((node) => node.webhookId && !node.disabled)) {
				additionalData ??= await WorkflowExecuteAdditionalData.getBase();
				rows.push(...(await this.resolveWorkflowWebhooks(entity, additionalData)));
			}
		}
		return rows;
	}

	private buildInMemoryTriggerRows(
		workflowId: string,
		workflowName: string,
		nodes: INode[],
		isActive: boolean,
	): TriggerRow[] {
		if (nodes.length === 0) return [];

		const kinds = getTriggerKinds(nodes, this.nodeTypes);
		return nodes
			.filter(
				(node) =>
					!node.disabled &&
					// Sub-workflow triggers are pseudo-triggers ('persisted') but belong in the list
					(kinds.get(node.id) === 'in-memory' || node.type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE),
			)
			.map((node) => ({
				kind: 'trigger',
				workflowId,
				workflowName,
				node: node.name,
				nodeType: node.type,
				isActive,
			}));
	}

	private async resolveWorkflowWebhooks(
		entity: WorkflowEntity,
		additionalData: IWorkflowExecuteAdditionalData,
	): Promise<TriggerRow[]> {
		try {
			const workflow = new Workflow({
				id: entity.id,
				name: entity.name,
				nodes: entity.nodes,
				connections: entity.connections,
				active: false,
				nodeTypes: this.nodeTypes,
			});

			// Resolving webhooks evaluates path/method expressions, which needs an isolate
			const webhooks = await workflow.expression.withIsolate(
				async () =>
					await Promise.resolve(
						WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true),
					),
			);

			return webhooks.map((webhookData) => {
				const node = workflow.getNode(webhookData.node);
				return {
					kind: 'webhook',
					workflowId: entity.id,
					workflowName: entity.name,
					method: webhookData.httpMethod,
					path: webhookData.path.includes(':')
						? `${node?.webhookId}/${webhookData.path}`
						: webhookData.path,
					node: webhookData.node,
					nodeType: node?.type,
					isActive: false,
				};
			});
		} catch (error) {
			// A workflow whose webhook expressions cannot resolve outside execution is skipped
			return [];
		}
	}

	@Post('/find')
	async findWebhook(req: Request) {
		const body = get(req, 'body', {}) as { path: string; method: Method };

		try {
			const webhook = await this.webhookService.findWebhook(body.method, body.path);
			return webhook;
		} catch (error) {
			return null;
		}
	}
}
