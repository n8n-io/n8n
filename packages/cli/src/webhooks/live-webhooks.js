'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.LiveWebhooks = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const webhook_not_found_error_1 = require('@/errors/response-errors/webhook-not-found.error');
const node_types_1 = require('@/node-types');
const WebhookHelpers = __importStar(require('@/webhooks/webhook-helpers'));
const webhook_service_1 = require('@/webhooks/webhook.service');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_static_data_service_1 = require('@/workflows/workflow-static-data.service');
const constants_1 = require('./constants');
const webhook_request_sanitizer_1 = require('./webhook-request-sanitizer');
let LiveWebhooks = class LiveWebhooks {
	constructor(logger, nodeTypes, webhookService, workflowRepository, workflowStaticDataService) {
		this.logger = logger;
		this.nodeTypes = nodeTypes;
		this.webhookService = webhookService;
		this.workflowRepository = workflowRepository;
		this.workflowStaticDataService = workflowStaticDataService;
	}
	async getWebhookMethods(path) {
		return await this.webhookService.getWebhookMethods(path);
	}
	async findAccessControlOptions(path, httpMethod) {
		const webhook = await this.findWebhook(path, httpMethod);
		const workflowData = await this.workflowRepository.findOne({
			where: { id: webhook.workflowId },
			select: ['nodes'],
		});
		const isChatWebhookNode = (type, webhookId) =>
			type === n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE && `${webhookId}/chat` === path;
		const nodes = workflowData?.nodes;
		const webhookNode = nodes?.find(
			({ type, parameters, typeVersion, webhookId }) =>
				(parameters?.path === path &&
					(parameters?.httpMethod ?? 'GET') === httpMethod &&
					'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion)) ||
				isChatWebhookNode(type, webhookId),
		);
		return webhookNode?.parameters?.options;
	}
	async executeWebhook(request, response) {
		const httpMethod = request.method;
		const path = request.params.path;
		this.logger.debug(`Received webhook "${httpMethod}" for path "${path}"`);
		request.params = {};
		const webhook = await this.findWebhook(path, httpMethod);
		if (webhook.isDynamic) {
			const pathElements = path.split('/').slice(1);
			webhook.webhookPath.split('/').forEach((ele, index) => {
				if (ele.startsWith(':')) {
					request.params[ele.slice(1)] = pathElements[index];
				}
			});
		}
		const workflowData = await this.workflowRepository.findOne({
			where: { id: webhook.workflowId },
			relations: { shared: { project: { projectRelations: true } } },
		});
		if (workflowData === null) {
			throw new not_found_error_1.NotFoundError(
				`Could not find workflow with id "${webhook.workflowId}"`,
			);
		}
		const workflow = new n8n_workflow_1.Workflow({
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
		const webhookData = this.webhookService
			.getNodeWebhooks(workflow, workflow.getNode(webhook.node), additionalData)
			.find((w) => w.httpMethod === httpMethod && w.path === webhook.webhookPath);
		const workflowStartNode = workflow.getNode(webhookData.node);
		if (workflowStartNode === null) {
			throw new not_found_error_1.NotFoundError('Could not find node to process webhook.');
		}
		if (!constants_1.authAllowlistedNodes.has(workflowStartNode.type)) {
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(request);
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
				async (error, data) => {
					if (error !== null) {
						return reject(error);
					}
					await this.workflowStaticDataService.saveStaticData(workflow);
					resolve(data);
				},
			);
		});
	}
	async findWebhook(path, httpMethod) {
		if (path.endsWith('/')) {
			path = path.slice(0, -1);
		}
		const webhook = await this.webhookService.findWebhook(httpMethod, path);
		const webhookMethods = await this.getWebhookMethods(path);
		if (webhook === null) {
			throw new webhook_not_found_error_1.WebhookNotFoundError(
				{ path, httpMethod, webhookMethods },
				{ hint: 'production' },
			);
		}
		return webhook;
	}
};
exports.LiveWebhooks = LiveWebhooks;
exports.LiveWebhooks = LiveWebhooks = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			node_types_1.NodeTypes,
			webhook_service_1.WebhookService,
			db_1.WorkflowRepository,
			workflow_static_data_service_1.WorkflowStaticDataService,
		]),
	],
	LiveWebhooks,
);
//# sourceMappingURL=live-webhooks.js.map
