import { Service } from 'typedi';
import type { Response } from 'express';
import { Workflow, NodeHelpers } from 'n8n-workflow';
import type { INode, IWebhookData, IHttpRequestMethods } from 'n8n-workflow';

import { WorkflowRepository } from '@db/repositories/workflow.repository';
import type {
	IResponseCallbackData,
	IWebhookManager,
	WebhookAccessControlOptions,
	WebhookRequest,
} from '@/Interfaces';
import { Logger } from '@/Logger';
import { NodeTypes } from '@/NodeTypes';
import { WebhookService } from '@/services/webhook.service';
import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import * as WebhookHelpers from '@/WebhookHelpers';
import { WorkflowStaticDataService } from '@/workflows/workflowStaticData.service';

@Service()
export class ActiveWebhooks implements IWebhookManager {
	constructor(
		private readonly logger: Logger,
		private readonly nodeTypes: NodeTypes,
		private readonly webhookService: WebhookService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
	) {}

	async getWebhookMethods(path: string) {
		return await this.webhookService.getWebhookMethods(path);
	}

	async findAccessControlOptions(path: string, httpMethod: IHttpRequestMethods) {
		const webhook = await this.findWebhook(path, httpMethod);

		const workflowData = await this.workflowRepository.findOne({
			where: { id: webhook.workflowId },
			select: ['nodes'],
		});

		const nodes = workflowData?.nodes;
		const webhookNode = nodes?.find(
			({ type, parameters, typeVersion }) =>
				parameters?.path === path &&
				(parameters?.httpMethod ?? 'GET') === httpMethod &&
				'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion),
		);
		return webhookNode?.parameters?.options as WebhookAccessControlOptions;
	}

	/**
	 * Checks if a webhook for the given method and path exists and executes the workflow.
	 */
	async executeWebhook(
		request: WebhookRequest,
		response: Response,
	): Promise<IResponseCallbackData> {
		const httpMethod = request.method;
		const path = request.params.path;

		this.logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);

		// Reset request parameters
		request.params = {} as WebhookRequest['params'];

		const webhook = await this.findWebhook(path, httpMethod);

		if (webhook.isDynamic) {
			const pathElements = path.split('/').slice(1);

			// extracting params from path
			// @ts-ignore
			webhook.webhookPath.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					// write params to req.params
					// @ts-ignore
					request.params[ele.slice(1)] = pathElements[index];
				}
			});
		}

		const workflowData = await this.workflowRepository.findOne({
			where: { id: webhook.workflowId },
			relations: { shared: { project: { projectRelations: true } } },
		});

		if (workflowData === null) {
			throw new NotFoundError(`Could not find workflow with id "${webhook.workflowId}"`);
		}

		const workflow = new Workflow({
			id: webhook.workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase();

		const webhookData = NodeHelpers.getNodeWebhooks(
			workflow,
			workflow.getNode(webhook.node) as INode,
			additionalData,
		).find((w) => w.httpMethod === httpMethod && w.path === webhook.webhookPath) as IWebhookData;

		// Get the node which has the webhook defined to know where to start from and to
		// get additional data
		const workflowStartNode = workflow.getNode(webhookData.node);

		if (workflowStartNode === null) {
			throw new NotFoundError('Could not find node to process webhook.');
		}

		return await new Promise((resolve, reject) => {
			const executionMode = 'webhook';
			void WebhookHelpers.executeWebhook(
				workflow,
				webhookData,
				workflowData,
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
	}

	private async findWebhook(path: string, httpMethod: IHttpRequestMethods) {
		// Remove trailing slash
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}

		const webhook = await this.webhookService.findWebhook(httpMethod, path);
		if (webhook === null) {
			throw new WebhookNotFoundError({ path, httpMethod }, { hint: 'production' });
		}

		return webhook;
	}
}
