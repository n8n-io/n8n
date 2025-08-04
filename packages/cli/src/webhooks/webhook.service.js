'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.WebhookService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_types_1 = require('@/node-types');
const cache_service_1 = require('@/services/cache/cache.service');
let WebhookService = class WebhookService {
	constructor(logger, webhookRepository, cacheService, nodeTypes) {
		this.logger = logger;
		this.webhookRepository = webhookRepository;
		this.cacheService = cacheService;
		this.nodeTypes = nodeTypes;
	}
	async populateCache() {
		const staticWebhooks = await this.webhookRepository.getStaticWebhooks();
		if (staticWebhooks.length === 0) return;
		void this.cacheService.setMany(staticWebhooks.map((w) => [w.cacheKey, w]));
	}
	async findAll() {
		return await this.webhookRepository.find();
	}
	async findCached(method, path) {
		const cacheKey = `webhook:${method}-${path}`;
		const cachedStaticWebhook = await this.cacheService.get(cacheKey);
		if (cachedStaticWebhook) return this.webhookRepository.create(cachedStaticWebhook);
		const dbStaticWebhook = await this.findStaticWebhook(method, path);
		if (dbStaticWebhook) {
			void this.cacheService.set(cacheKey, dbStaticWebhook);
			return dbStaticWebhook;
		}
		return await this.findDynamicWebhook(method, path);
	}
	async findStaticWebhook(method, path) {
		return await this.webhookRepository.findOneBy({ webhookPath: path, method });
	}
	async findDynamicWebhook(method, path) {
		const [uuidSegment, ...otherSegments] = path.split('/');
		const dynamicWebhooks = await this.webhookRepository.findBy({
			webhookId: uuidSegment,
			method,
			pathLength: otherSegments.length,
		});
		if (dynamicWebhooks.length === 0) return null;
		const requestSegments = new Set(otherSegments);
		const { webhook } = dynamicWebhooks.reduce(
			(acc, dw) => {
				const allStaticSegmentsMatch = dw.staticSegments.every((s) => requestSegments.has(s));
				if (allStaticSegmentsMatch && dw.staticSegments.length > acc.maxMatches) {
					acc.maxMatches = dw.staticSegments.length;
					acc.webhook = dw;
					return acc;
				} else if (dw.staticSegments.length === 0 && !acc.webhook) {
					acc.webhook = dw;
				}
				return acc;
			},
			{ webhook: null, maxMatches: 0 },
		);
		return webhook;
	}
	async findWebhook(method, path) {
		return await this.findCached(method, path);
	}
	async storeWebhook(webhook) {
		void this.cacheService.set(webhook.cacheKey, webhook);
		await this.webhookRepository.upsert(webhook, ['method', 'webhookPath']);
	}
	createWebhook(data) {
		return this.webhookRepository.create(data);
	}
	async deleteWorkflowWebhooks(workflowId) {
		const webhooks = await this.webhookRepository.findBy({ workflowId });
		return await this.deleteWebhooks(webhooks);
	}
	async deleteWebhooks(webhooks) {
		void this.cacheService.deleteMany(webhooks.map((w) => w.cacheKey));
		return await this.webhookRepository.remove(webhooks);
	}
	async getWebhookMethods(path) {
		return await this.webhookRepository
			.find({ select: ['method'], where: { webhookPath: path } })
			.then((rows) => rows.map((r) => r.method));
	}
	isDynamicPath(rawPath) {
		const firstSlashIndex = rawPath.indexOf('/');
		const path = firstSlashIndex !== -1 ? rawPath.substring(firstSlashIndex + 1) : rawPath;
		if (path === '' || path === ':' || path === '/:') return false;
		return path.startsWith(':') || path.includes('/:');
	}
	getNodeWebhooks(workflow, node, additionalData, ignoreRestartWebhooks = false) {
		if (node.disabled === true) {
			return [];
		}
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType.description.webhooks === undefined) {
			return [];
		}
		const workflowId = workflow.id || '__UNSAVED__';
		const mode = 'internal';
		const returnData = [];
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
			const isFullPath = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.isFullPath,
				'internal',
				{},
				undefined,
				false,
			);
			const restartWebhook = workflow.expression.getSimpleParameterValue(
				node,
				webhookDescription.restartWebhook,
				'internal',
				{},
				undefined,
				false,
			);
			const path = n8n_workflow_1.NodeHelpers.getNodeWebhookPath(
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
			let webhookId;
			if (this.isDynamicPath(path) && node.webhookId) {
				webhookId = node.webhookId;
			}
			String(webhookMethods)
				.split(',')
				.forEach((httpMethod) => {
					if (!httpMethod) return;
					returnData.push({
						httpMethod: httpMethod.trim(),
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
	async createWebhookIfNotExists(workflow, webhookData, mode, activation) {
		const webhookExists = await this.runWebhookMethod(
			'checkExists',
			workflow,
			webhookData,
			mode,
			activation,
		);
		if (!webhookExists) {
			await this.runWebhookMethod('create', workflow, webhookData, mode, activation);
		}
	}
	async deleteWebhook(workflow, webhookData, mode, activation) {
		await this.runWebhookMethod('delete', workflow, webhookData, mode, activation);
	}
	async runWebhookMethod(method, workflow, webhookData, mode, activation) {
		const node = workflow.getNode(webhookData.node);
		if (!node) return;
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		const webhookFn = nodeType.webhookMethods?.[webhookData.webhookDescription.name]?.[method];
		if (webhookFn === undefined) return;
		const context = new n8n_core_1.HookContext(
			workflow,
			node,
			webhookData.workflowExecuteAdditionalData,
			mode,
			activation,
			webhookData,
		);
		return await webhookFn.call(context);
	}
	async runWebhook(workflow, webhookData, node, additionalData, mode, runExecutionData) {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		if (nodeType.webhook === undefined) {
			throw new n8n_workflow_1.UnexpectedError('Node does not have any webhooks defined', {
				extra: { nodeName: node.name },
			});
		}
		const context = new n8n_core_1.WebhookContext(
			workflow,
			node,
			additionalData,
			mode,
			webhookData,
			[],
			runExecutionData ?? null,
		);
		return nodeType instanceof n8n_workflow_1.Node
			? await nodeType.webhook(context)
			: await nodeType.webhook.call(context);
	}
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.WebhookRepository,
			cache_service_1.CacheService,
			node_types_1.NodeTypes,
		]),
	],
	WebhookService,
);
//# sourceMappingURL=webhook.service.js.map
