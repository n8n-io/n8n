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
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { WebhookPathTakenError, Workflow } from 'n8n-workflow';

import { ErrorReporter, SpanStatus, Tracing } from 'n8n-core';

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
		private readonly tracing: Tracing,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Resolve workflow-defined webhook triggers.
	 *
	 * NOTE: evaluates each webhook node's `path`/`httpMethod` expressions, so
	 * when the vm expression engine is active the caller must hold an acquired
	 * isolate (`workflow.expression.acquireIsolate()`) around this call — it
	 * throws `No bridge acquired for this context` at runtime otherwise. This
	 * method cannot bracket internally because it is sync. Unlike
	 * {@link getNodesWithUnregisteredWebhooks}, which brackets itself.
	 */
	getWebhookTriggers(workflow: Workflow, additionalData: IWorkflowExecuteAdditionalData) {
		return WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
	}

	/**
	 * Register one workflow-defined webhook in storage and with third-party services.
	 */
	async register({ workflow, webhookData, mode, activation }: WebhookTriggerRegistrationOptions) {
		await this.tracing.startSpan(
			{
				name: 'Webhook trigger register',
				op: 'publication.webhook.register',
				attributes: {
					...this.tracing.pickWorkflowAttributes({ id: workflow.id, name: workflow.name }),
					...this.tracing.pickNodeAttributes({ name: webhookData.node }),
					'n8n.webhook.path': webhookData.path,
					'n8n.webhook.method': webhookData.httpMethod,
				},
			},
			async (span) => {
				const webhook = this.buildNormalizedWebhook(workflow, webhookData);

				let isStored = false;
				try {
					// `storeWebhook` registers the webhook atomically on the
					// (webhookPath, method) primary key and rejects a path already owned
					// by another workflow.
					await this.webhookService.storeWebhook(webhook);
					isStored = true;
					await this.webhookService.createWebhookIfNotExists(
						workflow,
						webhookData,
						mode,
						activation,
					);
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

				span.setStatus({ code: SpanStatus.ok });
			},
		);
	}

	/**
	 * Deregister one workflow-defined webhook from external services.
	 */
	async deregister({ workflow, webhookData }: WebhookTriggerDeregistrationOptions) {
		return await this.tracing.startSpan(
			{
				name: 'Webhook trigger deregister',
				op: 'publication.webhook.deregister',
				attributes: {
					...this.tracing.pickWorkflowAttributes({ id: workflow.id, name: workflow.name }),
					...this.tracing.pickNodeAttributes({ name: webhookData.node }),
				},
			},
			async (span) => {
				await this.webhookService.deleteWebhook(workflow, webhookData, 'internal', 'update');

				this.logger.debug(
					`Deactivating webhook "${webhookData.node}" for workflow "${workflow.name}"`,
					{
						workflow: { id: workflow.id, name: workflow.name },
						node: { name: webhookData.node, webhookId: webhookData.webhookId },
					},
				);

				span.setStatus({ code: SpanStatus.ok });
				return webhookData.node;
			},
		);
	}

	async clearWorkflowWebhooksForNodes(workflowId: string, nodeNames: string[]) {
		await this.webhookService.deleteWorkflowWebhooksForNodes(workflowId, nodeNames);
	}

	/**
	 * Of the given trigger nodes, returns the ids of those whose desired webhooks
	 * are not all present in storage. If any one of a node's webhooks is missing,
	 * the whole node is returned so it gets re-registered.
	 *
	 * This is used to recover from failures during registration.
	 *
	 * NOTE: it only considers the local registration, not any remote state
	 * (e.g., a third-party service that has lost the webhook).
	 */
	async getNodesWithUnregisteredWebhooks(
		workflow: Workflow,
		additionalData: IWorkflowExecuteAdditionalData,
		desiredNodes: Set<INode['id']>,
	): Promise<Set<INode['id']>> {
		// Resolving webhook triggers evaluates each node's `path`/`httpMethod`
		// expressions (e.g. the Form Trigger's dynamic path), which needs an isolate.
		// Only release if this call newly acquired it: acquire is idempotent per
		// caller but release is not reference-counted, so releasing an isolate a
		// caller up-stack still holds would return their bridge to the pool mid-use.
		const ownsIsolate = await workflow.expression.acquireIsolate();
		try {
			const desiredWebhooks = this.getWebhookTriggers(workflow, additionalData).filter(
				(webhookData) => desiredNodes.has(workflow.getNode(webhookData.node)?.id ?? ''),
			);
			if (desiredWebhooks.length === 0) {
				return new Set();
			}

			const registeredKeys = new Set(
				(await this.webhookService.getRegisteredWebhooks(workflow.id)).map((webhook) =>
					this.buildWebhookKey(webhook.method, webhook.webhookPath),
				),
			);

			const unregistered = new Set<INode['id']>();
			for (const webhookData of desiredWebhooks) {
				const node = workflow.getNode(webhookData.node);
				if (!node) {
					continue;
				}

				const webhook = this.buildNormalizedWebhook(workflow, webhookData);
				const key = this.buildWebhookKey(webhook.method, webhook.webhookPath);
				if (!registeredKeys.has(key)) {
					unregistered.add(node.id);
				}
			}

			return unregistered;
		} finally {
			if (ownsIsolate) await workflow.expression.releaseIsolate();
		}
	}

	/**
	 * Builds the storage entity for a webhook, normalizing its path so static and
	 * dynamic paths match what is persisted.
	 */
	private buildNormalizedWebhook(workflow: Workflow, webhookData: IWebhookData): WebhookEntity {
		const node = workflow.getNode(webhookData.node) as INode;

		const webhook = this.webhookService.createWebhook({
			workflowId: webhookData.workflowId,
			webhookPath: webhookData.path,
			node: node.name,
			method: webhookData.httpMethod,
		});

		this.normalizeWebhookPath(webhook, node.webhookId);

		return webhook;
	}

	/** Identity of a webhook row: its `(method, path)` primary key. */
	private buildWebhookKey(method: string, webhookPath: string): string {
		return `${method} ${webhookPath}`;
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
		webhook.webhookPath = webhook.webhookPath.trim();
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
