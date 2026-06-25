import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import {
	WorkflowRepository,
	WorkflowHistoryRepository,
	WorkflowPublishedEnvironmentVersionRepository,
	type WorkflowEntity,
	type WorkflowHistory,
} from '@n8n/db';
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
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowPublishedEnvVersionRepository: WorkflowPublishedEnvironmentVersionRepository,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
	) {}

	async getWebhookMethods(path: string) {
		return await this.webhookService.getWebhookMethods(path);
	}

	async findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const webhook = await this.findWebhook(path, httpMethod);

		let nodes: INode[] | undefined;
		let effectivePath = path;

		if (webhook.environmentId) {
			const envData = await this.loadEnvVersionExecutionData(
				webhook.workflowId,
				webhook.environmentId,
			);
			nodes = envData.publishedVersion.nodes as INode[];
			// Strip env prefix so path matching works against node parameters
			const prefixEnd = envData.envSlug.length + 1;
			effectivePath = path.slice(prefixEnd);
		} else {
			const workflowData = await this.workflowRepository.findOne({
				where: { id: webhook.workflowId },
				relations: { activeVersion: true },
			});
			nodes = workflowData?.activeVersion?.nodes as INode[] | undefined;
		}

		const isChatWebhookNode = (type: string, webhookId?: string) =>
			type === CHAT_TRIGGER_NODE_TYPE && `${webhookId}/chat` === effectivePath;

		const webhookNode = nodes?.find(
			({ type, parameters, typeVersion, webhookId }) =>
				(parameters?.path === effectivePath &&
					(parameters?.httpMethod ?? 'GET') === httpMethod &&
					'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion)) ||
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

		response.locals.workflowId = webhook.workflowId;

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

		let workflowData: WorkflowEntity;
		let publishedVersion: WorkflowHistory;
		// The effective path used for node matching — strips the env prefix for env-specific webhooks
		let effectiveWebhookPath = webhook.webhookPath;

		if (webhook.environmentId) {
			const envData = await this.loadEnvVersionExecutionData(
				webhook.workflowId,
				webhook.environmentId,
			);
			workflowData = envData.workflow;
			publishedVersion = envData.publishedVersion;
			// Strip "envSlug/" prefix so node lookup matches the original path
			const prefixEnd = envData.envSlug.length + 1;
			effectiveWebhookPath = webhook.webhookPath.slice(prefixEnd);
		} else {
			({ workflow: workflowData, publishedVersion } = await this.loadWebhookExecutionData(
				webhook.workflowId,
			));
		}

		const { nodes, connections } = publishedVersion;

		// Create a clean workflowData object with only activeVersion nodes/connections
		// This prevents any downstream code from accidentally using the draft nodes
		const activeWorkflowData: IWorkflowBase = { ...workflowData, nodes, connections };

		const workflow = new Workflow({
			id: webhook.workflowId,
			name: workflowData.name,
			nodes,
			connections,
			active: workflowData.activeVersionId !== null || webhook.environmentId !== undefined,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const ownerProjectId = workflowData.shared?.find(
			(share) => share.role === 'workflow:owner',
		)?.projectId;
		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			projectId: ownerProjectId,
		});

		await workflow.expression.acquireIsolate();
		try {
			const webhookData = this.webhookService
				.getNodeWebhooks(workflow, workflow.getNode(webhook.node) as INode, additionalData)
				.find(
					(w) => w.httpMethod === httpMethod && w.path === effectiveWebhookPath,
				) as IWebhookData;

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

	private async loadWebhookExecutionData(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory }> {
		return this.workflowsConfig.useWorkflowPublicationService
			? await this.loadFromPublishedVersion(workflowId)
			: await this.loadFromActiveVersion(workflowId);
	}

	/**
	 * New path for the workflow publication service. Behind a flag, disabled
	 * by default.
	 */
	private async loadFromPublishedVersion(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory }> {
		const publishedData =
			await this.workflowPublishedDataService.getPublishedWorkflowData(workflowId);
		if (publishedData === null) {
			throw new NotFoundError(`Published version not found for workflow with id "${workflowId}"`);
		}
		return { workflow: publishedData.workflow, publishedVersion: publishedData.publishedVersion };
	}

	/**
	 * Old path, before the workflow publication service. Currently the default.
	 */
	private async loadFromActiveVersion(
		workflowId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory }> {
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
		return { workflow: workflowData, publishedVersion: workflowData.activeVersion };
	}

	private async loadEnvVersionExecutionData(
		workflowId: string,
		environmentId: string,
	): Promise<{ workflow: WorkflowEntity; publishedVersion: WorkflowHistory; envSlug: string }> {
		const envVersions =
			await this.workflowPublishedEnvVersionRepository.getPublishedVersionsWithEnvironments(
				workflowId,
			);
		const envVersion = envVersions.find((v) => v.environmentId === environmentId);

		if (!envVersion) {
			throw new NotFoundError(
				`No published version found for workflow "${workflowId}" in environment "${environmentId}"`,
			);
		}

		const publishedVersion = await this.workflowHistoryRepository.findOne({
			where: { versionId: envVersion.publishedVersionId },
		});

		if (!publishedVersion) {
			throw new NotFoundError(
				`Workflow history snapshot not found for version "${envVersion.publishedVersionId}"`,
			);
		}

		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
			relations: { shared: true },
		});

		if (!workflowData) {
			throw new NotFoundError(`Could not find workflow with id "${workflowId}"`);
		}

		const envSlug = envVersion.environmentName.toLowerCase().replace(/\s+/g, '-');

		return { workflow: workflowData, publishedVersion, envSlug };
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
