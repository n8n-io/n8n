import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type {
	INode,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { WebhookPathTakenError, Workflow } from 'n8n-workflow';

import { ErrorReporter } from 'n8n-core';

import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

function hasErrorDetail(error: unknown): error is Error & { detail: string } {
	return (
		error instanceof Error && typeof (error as Error & { detail?: unknown }).detail === 'string'
	);
}

function isQueryFailedError(error: unknown): error is Error {
	return error instanceof Error && error.name === 'QueryFailedError';
}

export interface WebhookTriggerRegistrationOptions {
	workflow: Workflow;
	additionalData: IWorkflowExecuteAdditionalData;
	mode: WorkflowExecuteMode;
	activation: WorkflowActivateMode;
	nodeIds: Set<string>;
}

/**
 * Registers and deregisters workflow webhook triggers in storage and external services.
 */
@Service()
export class WebhookTriggerRegistrar {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly webhookService: WebhookService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
	) {
		this.logger = this.logger.scoped(['workflow-activation']);
	}

	/**
	 * Register workflow-defined webhooks in storage and with third-party services.
	 */
	async register({
		workflow,
		additionalData,
		mode,
		activation,
		nodeIds,
	}: WebhookTriggerRegistrationOptions) {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			undefined,
			true,
		).filter((webhookData) => nodeIds.has(workflow.getNode(webhookData.node)?.id ?? ''));

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

			this.normalizeWebhookPath(webhook);

			if ((webhookData.path.startsWith(':') || webhookData.path.includes('/:')) && node.webhookId) {
				webhook.webhookId = node.webhookId;
				webhook.pathLength = webhook.webhookPath.split('/').length;
			}

			try {
				// `storeWebhook` registers the webhook atomically on the
				// (webhookPath, method) primary key and rejects a path already owned
				// by another workflow. The `catch` below still cleans up any webhooks
				// already registered for this workflow if a later step fails.
				await this.webhookService.storeWebhook(webhook);
				await this.webhookService.createWebhookIfNotExists(workflow, webhookData, mode, activation);
			} catch (error) {
				if (['init', 'leadershipChange'].includes(activation) && isQueryFailedError(error)) {
					// n8n does not remove the registered webhooks on exit.
					// This means that further initializations will always fail
					// when inserting to database. This is why we ignore this error
					// as it's expected to happen.

					continue;
				}

				try {
					await this.clearWorkflowWebhooks(workflow.id);
				} catch (clearError) {
					this.errorReporter.error(clearError);
					this.logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${clearError.message}"`,
					);
				}

				// If it's a workflow from the insert.
				// TODO check if there is standard error code for duplicate key violation that works
				// with all databases.
				if (isQueryFailedError(error)) {
					throw new WebhookPathTakenError(webhook.node, error);
				}

				if (hasErrorDetail(error)) {
					// It's an error running the webhook methods (checkExists, create).
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
	 * Deregisters a workflow's webhooks from external services and persists any
	 * resulting static data. Returns the names of the nodes whose webhooks were
	 * deregistered.
	 */
	async deregister(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		nodeIds: Set<string>,
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
				if (!nodeIds.has(workflow.getNode(webhookData.node)?.id ?? '')) {
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

	async clearWorkflowWebhooks(workflowId: string) {
		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}

	async clearWorkflowWebhooksForNodes(workflowId: string, nodeNames: string[]) {
		await this.webhookService.deleteWorkflowWebhooksForNodes(workflowId, nodeNames);
	}

	private normalizeWebhookPath(webhook: { webhookPath: string }) {
		if (webhook.webhookPath.startsWith('/')) {
			webhook.webhookPath = webhook.webhookPath.slice(1);
		}
		if (webhook.webhookPath.endsWith('/')) {
			webhook.webhookPath = webhook.webhookPath.slice(0, -1);
		}
	}
}
