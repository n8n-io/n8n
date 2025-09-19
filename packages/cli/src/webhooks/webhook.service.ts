import { Logger } from '@n8n/backend-common';
import type { WebhookEntity } from '@n8n/db';
import { WebhookRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { HookContext, WebhookContext } from 'n8n-core';
import { Node, NodeHelpers, UnexpectedError } from 'n8n-workflow';
import type {
	IHttpRequestMethods,
	INode,
	IRunExecutionData,
	IWebhookData,
	IWebhookResponseData,
	IWorkflowExecuteAdditionalData,
	WebhookSetupMethodNames,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { CacheService } from '@/services/cache/cache.service';

import type { Method } from './webhook.types';

@Service()
export class WebhookService {
	constructor(
		private readonly logger: Logger,
		private readonly webhookRepository: WebhookRepository,
		private readonly cacheService: CacheService,
		private readonly nodeTypes: NodeTypes,
	) {}

	async populateCache() {
		const staticWebhooks = await this.webhookRepository.getStaticWebhooks();

		if (staticWebhooks.length === 0) return;

		void this.cacheService.setMany(staticWebhooks.map((w) => [w.cacheKey, w]));
	}

	async findAll() {
		return await this.webhookRepository.find();
	}

	private async findCached(method: Method, path: string) {
		const cacheKey = `webhook:${method}-${path}`;

		const cachedStaticWebhook = await this.cacheService.get(cacheKey);

		if (cachedStaticWebhook) return this.webhookRepository.create(cachedStaticWebhook);

		const dbStaticWebhook = await this.findStaticWebhook(method, path);

		if (dbStaticWebhook) {
			void this.cacheService.set(cacheKey, dbStaticWebhook);
			return dbStaticWebhook;
		}

		return await this.findDynamicWebhook(path, method);
	}

	/**
	 * Find a matching webhook with zero dynamic path segments, e.g. `<uuid>` or `user/profile`.
	 */
	private async findStaticWebhook(method: Method, path: string) {
		return await this.webhookRepository.findOneBy({ webhookPath: path, method });
	}

	/**
	 * Find a matching webhook with one or more dynamic path segments, e.g. `<uuid>/user/:id/posts`.
	 * It is mandatory for dynamic webhooks to have `<uuid>/` at the base.
	 */
	private async findDynamicWebhook(path: string, method?: Method) {
		const [uuidSegment, ...otherSegments] = path.split('/');

		const dynamicWebhooks = await this.webhookRepository.findBy({
			webhookId: uuidSegment,
			method,
			pathLength: otherSegments.length,
		});

		if (dynamicWebhooks.length === 0) return null;

		const requestSegments = new Set(otherSegments);

		const { webhook } = dynamicWebhooks.reduce<{
			webhook: WebhookEntity | null;
			maxMatches: number;
		}>(
			(acc, dw) => {
				const allStaticSegmentsMatch = dw.staticSegments.every((s) => requestSegments.has(s));

				if (allStaticSegmentsMatch && dw.staticSegments.length > acc.maxMatches) {
					acc.maxMatches = dw.staticSegments.length;
					acc.webhook = dw;
					return acc;
				} else if (dw.staticSegments.length === 0 && !acc.webhook) {
					acc.webhook = dw; // edge case: if path is `:var`, match on anything
				}

				return acc;
			},
			{ webhook: null, maxMatches: 0 },
		);

		return webhook;
	}

	async findWebhook(method: Method, path: string) {
		return await this.findCached(method, path);
	}

	async storeWebhook(webhook: WebhookEntity) {
		void this.cacheService.set(webhook.cacheKey, webhook);

		await this.webhookRepository.upsert(webhook, ['method', 'webhookPath']);
	}

	createWebhook(data: Partial<WebhookEntity>) {
		return this.webhookRepository.create(data);
	}

	async deleteWorkflowWebhooks(workflowId: string) {
		const webhooks = await this.webhookRepository.findBy({ workflowId });

		return await this.deleteWebhooks(webhooks);
	}

	private async deleteWebhooks(webhooks: WebhookEntity[]) {
		void this.cacheService.deleteMany(webhooks.map((w) => w.cacheKey));

		return await this.webhookRepository.remove(webhooks);
	}

	async getWebhookMethods(rawPath: string) {
		// Try to find static webhooks first
		const staticMethods = await this.webhookRepository
			.find({ select: ['method'], where: { webhookPath: rawPath } })
			.then((rows) => rows.map((r) => r.method));

		if (staticMethods.length > 0) {
			return staticMethods;
		}

		// Otherwise, try to find dynamic webhooks based on path only
		const dynamicWebhooks = await this.findDynamicWebhook(rawPath);
		return dynamicWebhooks ? [dynamicWebhooks.method] : [];
	}

	private isDynamicPath(rawPath: string) {
		const firstSlashIndex = rawPath.indexOf('/');
		const path = firstSlashIndex !== -1 ? rawPath.substring(firstSlashIndex + 1) : rawPath;

		// if dynamic, first segment is webhook ID so disregard it

		if (path === '' || path === ':' || path === '/:') return false;

		return path.startsWith(':') || path.includes('/:');
	}

	/**
	 * Returns all the webhooks which should be created for the give node
	 */
	getNodeWebhooks(
		workflow: Workflow,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		ignoreRestartWebhooks = false,
	): IWebhookData[] {
		if (node.disabled === true) {
			// Node is disabled so webhooks will also not be enabled
			return [];
		}

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (nodeType.description.webhooks === undefined) {
			// Node does not have any webhooks so return
			return [];
		}

		const workflowId = workflow.id || '__UNSAVED__';
		const mode = 'internal';

		const returnData: IWebhookData[] = [];
		for (const webhookDescription of nodeType.description.webhooks) {
			if (ignoreRestartWebhooks && webhookDescription.restartWebhook === true) {
				continue;
			}

			let nodeWebhookPath = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.path,
				mode,
				{},
			);
			if (nodeWebhookPath === undefined) {
				this.logger.error(
					`No webhook path could be found for node "${node.name}" in workflow "${workflowId}".`,
				);
				continue;
			}

			nodeWebhookPath = nodeWebhookPath.toString();

			if (nodeWebhookPath.startsWith('/')) {
				nodeWebhookPath = nodeWebhookPath.slice(1);
			}
			if (nodeWebhookPath.endsWith('/')) {
				nodeWebhookPath = nodeWebhookPath.slice(0, -1);
			}

			const isFullPath: boolean = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.isFullPath,
				'internal',
				{},
				undefined,
				false,
			) as boolean;
			const restartWebhook: boolean = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.restartWebhook,
				'internal',
				{},
				undefined,
				false,
			) as boolean;
			const path = NodeHelpers.getNodeWebhookPath(
				workflowId,
				node,
				nodeWebhookPath,
				isFullPath,
				restartWebhook,
			);

			const webhookMethods = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.httpMethod,
				mode,
				{},
				undefined,
				'GET',
			);

			if (webhookMethods === undefined) {
				this.logger.error(
					`The webhook "${path}" for node "${node.name}" in workflow "${workflowId}" could not be added because the httpMethod is not defined.`,
				);
				continue;
			}

			let webhookId: string | undefined;

			if (this.isDynamicPath(path) && node.webhookId) {
				webhookId = node.webhookId;
			}

			String(webhookMethods)
				.split(',')
				.forEach((httpMethod) => {
					if (!httpMethod) return;
					returnData.push({
						httpMethod: httpMethod.trim() as IHttpRequestMethods,
						node: node.name,
						path,
						webhookDescription,
						workflowId,
						workflowExecuteAdditionalData: additionalData,
						webhookId,
					});
				});
		}

		return returnData;
	}

	async createWebhookIfNotExists(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<void> {
		const webhookExists = await this.runWebhookMethod(
			'checkExists',
			workflow,
			webhookData,
			mode,
			activation,
		);
		if (!webhookExists) {
			// If webhook does not exist yet create it
			await this.runWebhookMethod('create', workflow, webhookData, mode, activation);
		}
	}

	async deleteWebhook(
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	) {
		await this.runWebhookMethod('delete', workflow, webhookData, mode, activation);
	}

	private async runWebhookMethod(
		method: WebhookSetupMethodNames,
		workflow: Workflow,
		webhookData: IWebhookData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<boolean | undefined> {
		const node = workflow.getNode(webhookData.node);

		if (!node) return;

		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		const webhookFn = nodeType.webhookMethods?.[webhookData.webhookDescription.name]?.[method];
		if (webhookFn === undefined) return;

		const context = new HookContext(
			workflow,
			node,
			webhookData.workflowExecuteAdditionalData,
			mode,
			activation,
			webhookData,
		);

		return (await webhookFn.call(context)) as boolean;
	}

	/**
	 * Executes the webhook data to see what it should return and if the
	 * workflow should be started or not
	 */
	async runWebhook(
		workflow: Workflow,
		webhookData: IWebhookData,
		node: INode,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		runExecutionData: IRunExecutionData | null,
	): Promise<IWebhookResponseData> {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType.webhook === undefined) {
			throw new UnexpectedError('Node does not have any webhooks defined', {
				extra: { nodeName: node.name },
			});
		}

		const context = new WebhookContext(
			workflow,
			node,
			additionalData,
			mode,
			webhookData,
			[],
			runExecutionData ?? null,
		);

		return nodeType instanceof Node
			? await nodeType.webhook(context)
			: ((await nodeType.webhook.call(context)) as IWebhookResponseData);
	}
}
