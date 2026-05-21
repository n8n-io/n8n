import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Response } from 'express';
import { Workflow, CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { INode, IWebhookData, IHttpRequestMethods, IWorkflowBase } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { NodeTypes } from '@/node-types';
import * as WebhookHelpers from '@/webhooks/webhook-helpers';
import { WebhookService } from '@/webhooks/webhook.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { authAllowlistedNodes } from './constants';
import { matchesExpectedNodeType } from './node-type-matcher';
import type { ExpectedWebhookNodeType } from './node-type-matcher';
import { sanitizeWebhookRequest } from './webhook-request-sanitizer';
import type {
	IWebhookResponseCallbackData,
	IWebhookManager,
	WebhookAccessControlOptions,
	WebhookRequest,
} from './webhook.types';

interface WebhookExecutionData {
	nodes: INode[];
	connections: IWorkflowBase['connections'];
	workflowName: string;
	staticData: IWorkflowBase['staticData'];
	settings: IWorkflowBase['settings'];
	isActive: boolean;
	ownerProjectId: string | undefined;
	activeWorkflowData: IWorkflowBase;
}

function findOwnerProjectId(
	shared: ReadonlyArray<{ role: string; projectId?: string }> | undefined,
): string | undefined {
	return shared?.find((share) => share.role === 'workflow:owner')?.projectId;
}

/**
 * Service for handling the execution of live webhooks, i.e. webhooks
 * that belong to activated workflows and use the production URL
 * (https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/#webhook-urls)
 */
@Service()
export class LiveWebhooks implements IWebhookManager {
	constructor(
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
	) {}

	async getWebhookMethods(path: string) {
		return await this.webhookService.getWebhookMethods(path);
	}

	async findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const webhook = await this.findWebhook(path, httpMethod);

		const nodes = await this.getWorkflowNodes(webhook.workflowId);

		const isChatWebhookNode = (type: string, webhookId?: string) =>
			type === CHAT_TRIGGER_NODE_TYPE && `${webhookId}/chat` === path;

		const webhookNode = nodes?.find(
			({ type, parameters, typeVersion, webhookId }) =>
				(parameters?.path === path &&
					(parameters?.httpMethod ?? 'GET') === httpMethod &&
					'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion)) ||
				// Chat Trigger has doesn't have configurable path and is always using POST, so
				// we need to use webhookId for matching
				isChatWebhookNode(type, webhookId),
		);

		return webhookNode?.parameters?.options as WebhookAccessControlOptions;
	}

	/**
	 * Checks if a webhook for the given method and path exists and executes the workflow.
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: Response,
		expectedNodeType?: ExpectedWebhookNodeType,
	): Promise<IWebhookResponseCallbackData> {
		const httpMethod = request.method;
		const path = request.params.path;

		this.logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);

		// Reset request parameters
		request.params = {} as WebhookRequest['params'];

		const webhook = await this.findWebhook(path, httpMethod);

		if (webhook.isDynamic) {
			const pathElements = path.split('/').slice(1);

			// extracting params from path
			webhook.webhookPath.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					// write params to req.params
					request.params[ele.slice(1)] = pathElements[index];
				}
			});
		}

		const {
			nodes,
			connections,
			workflowName,
			staticData,
			settings,
			isActive,
			ownerProjectId,
			activeWorkflowData,
		} = await this.loadWebhookExecutionData(webhook.workflowId);

		const workflow = new Workflow({
			id: webhook.workflowId,
			name: workflowName,
			nodes,
			connections,
			active: isActive,
			nodeTypes: this.nodeTypes,
			staticData,
			settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			projectId: ownerProjectId,
		});

		await workflow.expression.acquireIsolate();
		try {
			const webhookData = this.webhookService
				.getNodeWebhooks(workflow, workflow.getNode(webhook.node) as INode, additionalData)
				.find((w) => w.httpMethod === httpMethod && w.path === webhook.webhookPath) as IWebhookData;

			if (
				expectedNodeType &&
				!matchesExpectedNodeType(expectedNodeType, webhookData?.webhookDescription.nodeType)
			) {
				throw new WebhookNotFoundError(
					{ path, httpMethod, webhookMethods: await this.getWebhookMethods(path) },
					{ hint: 'production' },
				);
			}

			// Get the node which has the webhook defined to know where to start from and to
			// get additional data
			const workflowStartNode = workflow.getNode(webhookData.node);

			if (workflowStartNode === null) {
				throw new NotFoundError('Could not find node to process webhook.');
			}

			if (!authAllowlistedNodes.has(workflowStartNode.type)) {
				sanitizeWebhookRequest(request);
			}

			return await new Promise((resolve, reject) => {
				const executionMode = 'webhook';
				void WebhookHelpers.executeWebhook(
					workflow,
					webhookData,
					activeWorkflowData, // Use activeWorkflowData instead of workflowData
					workflowStartNode,
					executionMode,
					undefined,
					undefined,
					undefined,
					request,
					response,
					async (error: Error | null, data: object) => {
						if (error !== null) {
							return reject(error);
						}
						// Save static data if it changed
						await this.workflowStaticDataService.saveStaticData(workflow);
						resolve(data);
					},
				);
			});
		} finally {
			await workflow.expression.releaseIsolate();
		}
	}

	private async getWorkflowNodes(workflowId: string): Promise<INode[] | undefined> {
		if (this.workflowsConfig.useWorkflowPublicationService) {
			const publishedData =
				await this.workflowPublishedDataService.getPublishedWorkflowData(workflowId);
			return publishedData?.nodes;
		} else {
			const workflowData = await this.workflowRepository.findOne({
				where: { id: workflowId },
				select: ['nodes'],
			});
			return workflowData?.nodes;
		}
	}

	private async loadWebhookExecutionData(workflowId: string): Promise<WebhookExecutionData> {
		return this.workflowsConfig.useWorkflowPublicationService
			? await this.loadFromPublishedVersion(workflowId)
			: await this.loadFromActiveVersion(workflowId);
	}

	private async loadFromPublishedVersion(workflowId: string): Promise<WebhookExecutionData> {
		const publishedData =
			await this.workflowPublishedDataService.getPublishedWorkflowData(workflowId);
		if (publishedData === null) {
			throw new NotFoundError(`Published version not found for workflow with id "${workflowId}"`);
		}

		const { nodes, connections, workflow } = publishedData;
		return {
			nodes,
			connections,
			workflowName: publishedData.name,
			staticData: publishedData.staticData,
			settings: publishedData.settings,
			isActive: true,
			ownerProjectId: findOwnerProjectId(publishedData.shared),
			activeWorkflowData: { ...workflow, nodes, connections },
		};
	}

	private async loadFromActiveVersion(workflowId: string): Promise<WebhookExecutionData> {
		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { activeVersion: true, shared: true },
		});
		if (workflowData === null) {
			throw new NotFoundError(`Could not find workflow with id "${workflowId}"`);
		}
		if (!workflowData.activeVersion) {
			throw new NotFoundError(`Active version not found for workflow with id "${workflowId}"`);
		}

		const { nodes, connections } = workflowData.activeVersion;
		return {
			nodes,
			connections,
			workflowName: workflowData.name,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
			isActive: workflowData.activeVersionId !== null,
			ownerProjectId: findOwnerProjectId(workflowData.shared),
			activeWorkflowData: { ...workflowData, nodes, connections },
		};
	}

	private async findWebhook(path: string, httpMethod: IHttpRequestMethods) {
		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		const webhook = await this.webhookService.findWebhook(httpMethod, path);
		const webhookMethods = await this.getWebhookMethods(path);
		if (webhook === null) {
			throw new WebhookNotFoundError({ path, httpMethod, webhookMethods }, { hint: 'production' });
		}

		return webhook;
	}
}
