/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Logger } from '@n8n/backend-common';
import type { WebhookEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type {
	INode,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { Workflow, WebhookPathTakenError } from 'n8n-workflow';
import assert from 'node:assert';

import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

interface AddWebhooksOptions {
	workflow: Workflow;
	additionalData: IWorkflowExecuteAdditionalData;
	mode: WorkflowExecuteMode;
	activation: WorkflowActivateMode;
	/** Only the webhooks of these node ids are registered. */
	nodeIds: Set<INode['id']>;
}

/**
 * Registers and deregisters a workflow's webhooks in the `webhook_entity` table
 * and with external services. Used by the workflow publication flow to add and
 * remove individual trigger nodes' webhooks.
 */
@Service()
export class WebhookActivationService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly webhookService: WebhookService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Register the webhooks of the given nodes in the `workflow_entity` table.
	 */
	async addWebhooks({ workflow, additionalData, mode, activation, nodeIds }: AddWebhooksOptions) {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			undefined,
			true,
		).filter((webhookData) => {
			const node = workflow.getNode(webhookData.node);
			assert(node);

			return nodeIds.has(node.id);
		});

		if (webhooks.length === 0) return false;

		for (const webhookData of webhooks) {
			const node = workflow.getNode(webhookData.node) as INode;
			node.name = webhookData.node;

			const webhook = this.webhookService.createWebhook({
				workflowId: webhookData.workflowId,
				webhookPath: webhookData.path,
				node: node.name,
				method: webhookData.httpMethod,
			});

			this.normalizeWebhookPath(webhook, node);

			try {
				// TODO: this should happen in a transaction, that way we don't need to manually remove this in `catch`
				await this.webhookService.storeWebhook(webhook);
				await this.webhookService.createWebhookIfNotExists(workflow, webhookData, mode, activation);
			} catch (error) {
				if (
					['init', 'leadershipChange'].includes(activation) &&
					error.name === 'QueryFailedError'
				) {
					// n8n does not remove the registered webhooks on exit.
					// This means that further initializations will always fail
					// when inserting to database. This is why we ignore this error
					// as it's expected to happen.

					continue;
				}

				try {
					const removedNodeNames = await this.deregisterWebhooks(workflow, additionalData, nodeIds);
					await this.webhookService.deleteWorkflowWebhooksForNodes(workflow.id, removedNodeNames);
				} catch (error1) {
					this.errorReporter.error(error1);
					this.logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error1.message}"`,
					);
				}

				// if it's a workflow from the insert
				// TODO check if there is standard error code for duplicate key violation that works
				// with all databases
				if (error instanceof Error && error.name === 'QueryFailedError') {
					error = new WebhookPathTakenError(webhook.node, error);
				} else if (error.detail) {
					// it's a error running the webhook methods (checkExists, create)
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					error.message = error.detail;
				}

				throw error;
			}
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		this.logger.debug(`Added webhooks for workflow "${workflow.name}" (ID ${workflow.id})`, {
			workflowId: workflow.id,
		});

		return true;
	}

	/**
	 * Strips leading/trailing slashes from the webhook path and, for dynamic
	 * (parameterized) paths, records the node's webhook id and path length on the
	 * webhook entity.
	 */
	private normalizeWebhookPath(webhook: WebhookEntity, node: INode) {
		const path = webhook.webhookPath;

		if (webhook.webhookPath.startsWith('/')) {
			webhook.webhookPath = webhook.webhookPath.slice(1);
		}
		if (webhook.webhookPath.endsWith('/')) {
			webhook.webhookPath = webhook.webhookPath.slice(0, -1);
		}

		if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
			webhook.webhookId = node.webhookId;
			webhook.pathLength = webhook.webhookPath.split('/').length;
		}
	}

	/**
	 * Deregisters the webhooks of the given nodes from external services and
	 * persists any resulting static data. Returns the names of the nodes whose
	 * webhooks were deregistered.
	 */
	async deregisterWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<INode['id']>,
	) {
		const removedNodeNames: string[] = [];

		await workflow.expression.acquireIsolate();
		try {
			const webhooks = WebhookHelpers.getWorkflowWebhooks(
				workflow,
				additionalData,
				undefined,
				true,
			);

			for (const webhookData of webhooks) {
				const node = workflow.getNode(webhookData.node);
				assert(node);

				if (!nodeIds.has(node.id)) {
					continue;
				}

				await this.webhookService.deleteWebhook(workflow, webhookData, 'internal', 'update');
				removedNodeNames.push(webhookData.node);
			}
		} finally {
			await workflow.expression.releaseIsolate();
		}

		await this.workflowStaticDataService.saveStaticData(workflow);

		return removedNodeNames;
	}
}
