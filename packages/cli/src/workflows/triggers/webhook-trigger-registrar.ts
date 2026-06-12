import { Logger } from '@n8n/backend-common';
import type { WebhookEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	INode,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { WebhookPathTakenError, Workflow, ensureError } from 'n8n-workflow';

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
	webhookData: IWebhookData;
	mode: WorkflowExecuteMode;
	activation: WorkflowActivateMode;
}

export interface WebhookTriggerDeregistrationOptions {
	workflow: Workflow;
	webhookData: IWebhookData;
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
	 * Resolve workflow-defined webhook triggers.
	 */
	getWebhookTriggers(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
		return WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
	}

	/**
	 * Register one workflow-defined webhook in storage and with third-party services.
	 */
	async register({ workflow, webhookData, mode, activation }: WebhookTriggerRegistrationOptions) {
		const node = workflow.getNode(webhookData.node) as INode;
		node.name = webhookData.node;

		const webhook = this.webhookService.createWebhook({
			workflowId: webhookData.workflowId,
			webhookPath: webhookData.path,
			node: node.name,
			method: webhookData.httpMethod,
		});

		this.normalizeWebhookPath(webhook, node.webhookId);

		let isStored = false;
		try {
			// `storeWebhook` registers the webhook atomically on the
			// (webhookPath, method) primary key and rejects a path already owned
			// by another workflow.
			await this.webhookService.storeWebhook(webhook);
			isStored = true;
			await this.webhookService.createWebhookIfNotExists(workflow, webhookData, mode, activation);
		} catch (error) {
			if (isStored) await this.clearRegisteredWebhook(workflow, webhookData);

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

		this.logger.debug(`Added webhook "${webhookData.node}" for workflow "${workflow.name}"`, {
			workflowId: workflow.id,
			nodeName: webhookData.node,
		});
	}

	/**
	 * Deregister one workflow-defined webhook from external services.
	 */
	async deregister({ workflow, webhookData }: WebhookTriggerDeregistrationOptions) {
		await this.webhookService.deleteWebhook(workflow, webhookData, 'internal', 'update');

		return webhookData.node;
	}

	async clearWorkflowWebhooksForNodes(workflowId: string, nodeNames: string[]) {
		await this.webhookService.deleteWorkflowWebhooksForNodes(workflowId, nodeNames);
	}

	private async clearRegisteredWebhook(workflow: Workflow, webhookData: IWebhookData) {
		try {
			await this.deregister({ workflow, webhookData });
			await this.workflowStaticDataService.saveStaticData(workflow);

			await this.clearWorkflowWebhooksForNodes(workflow.id, [webhookData.node]);
		} catch (clearError) {
			const error = ensureError(clearError);
			this.errorReporter.error(error);
			this.logger.error(
				`Could not remove webhook "${webhookData.node}" of workflow "${workflow.id}" because of error: "${error.message}"`,
			);
		}
	}

	private normalizeWebhookPath(webhook: WebhookEntity, nodeWebhookId?: string) {
		if (webhook.webhookPath.startsWith('/')) {
			webhook.webhookPath = webhook.webhookPath.slice(1);
		}
		if (webhook.webhookPath.endsWith('/')) {
			webhook.webhookPath = webhook.webhookPath.slice(0, -1);
		}
		if (
			(webhook.webhookPath.startsWith(':') || webhook.webhookPath.includes('/:')) &&
			nodeWebhookId
		) {
			webhook.webhookId = nodeWebhookId;
			webhook.pathLength = webhook.webhookPath.split('/').length;
		}
	}
}
