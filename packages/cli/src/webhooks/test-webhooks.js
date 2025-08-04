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
exports.TestWebhooks = void 0;
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const webhook_not_found_error_1 = require('@/errors/response-errors/webhook-not-found.error');
const workflow_missing_id_error_1 = require('@/errors/workflow-missing-id.error');
const node_types_1 = require('@/node-types');
const push_1 = require('@/push');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const utils_1 = require('@/utils');
const test_webhook_registrations_service_1 = require('@/webhooks/test-webhook-registrations.service');
const WebhookHelpers = __importStar(require('@/webhooks/webhook-helpers'));
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const constants_2 = require('./constants');
const webhook_request_sanitizer_1 = require('./webhook-request-sanitizer');
const webhook_service_1 = require('./webhook.service');
let TestWebhooks = class TestWebhooks {
	constructor(push, nodeTypes, registrations, instanceSettings, publisher, webhookService) {
		this.push = push;
		this.nodeTypes = nodeTypes;
		this.registrations = registrations;
		this.instanceSettings = instanceSettings;
		this.publisher = publisher;
		this.webhookService = webhookService;
		this.timeouts = {};
	}
	async executeWebhook(request, response) {
		const httpMethod = request.method;
		let path = (0, utils_1.removeTrailingSlash)(request.params.path);
		request.params = {};
		let webhook = await this.getActiveWebhook(httpMethod, path);
		if (!webhook) {
			const [webhookId, ...segments] = path.split('/');
			webhook = await this.getActiveWebhook(httpMethod, segments.join('/'), webhookId);
			if (!webhook)
				throw new webhook_not_found_error_1.WebhookNotFoundError({
					path,
					httpMethod,
					webhookMethods: await this.getWebhookMethods(path),
				});
			path = webhook.path;
			path.split('/').forEach((segment, index) => {
				if (segment.startsWith(':')) {
					request.params[segment.slice(1)] = segments[index];
				}
			});
		}
		const key = this.registrations.toKey(webhook);
		const registration = await this.registrations.get(key);
		if (!registration) {
			throw new webhook_not_found_error_1.WebhookNotFoundError({
				path,
				httpMethod,
				webhookMethods: await this.getWebhookMethods(path),
			});
		}
		const { destinationNode, pushRef, workflowEntity, webhook: testWebhook } = registration;
		const workflow = this.toWorkflow(workflowEntity);
		if (testWebhook.staticData) workflow.setTestStaticData(testWebhook.staticData);
		const workflowStartNode = workflow.getNode(webhook.node);
		if (workflowStartNode === null) {
			throw new not_found_error_1.NotFoundError('Could not find node to process webhook.');
		}
		if (!constants_2.authAllowlistedNodes.has(workflowStartNode.type)) {
			(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(request);
		}
		return await new Promise(async (resolve, reject) => {
			try {
				const executionMode = 'manual';
				const executionId = await WebhookHelpers.executeWebhook(
					workflow,
					webhook,
					workflowEntity,
					workflowStartNode,
					executionMode,
					pushRef,
					undefined,
					undefined,
					request,
					response,
					(error, data) => {
						if (error !== null) reject(error);
						else resolve(data);
					},
					destinationNode,
				);
				if (executionId === undefined) return;
				if (pushRef !== undefined) {
					this.push.send(
						{ type: 'testWebhookReceived', data: { workflowId: webhook?.workflowId, executionId } },
						pushRef,
					);
				}
			} catch {}
			if (this.instanceSettings.isMultiMain && pushRef && !this.push.hasPushRef(pushRef)) {
				void this.publisher.publishCommand({
					command: 'clear-test-webhooks',
					payload: { webhookKey: key, workflowEntity, pushRef },
				});
				return;
			}
			this.clearTimeout(key);
			await this.deactivateWebhooks(workflow);
		});
	}
	async handleClearTestWebhooks({ webhookKey, workflowEntity, pushRef }) {
		if (!this.push.hasPushRef(pushRef)) return;
		this.clearTimeout(webhookKey);
		const workflow = this.toWorkflow(workflowEntity);
		await this.deactivateWebhooks(workflow);
	}
	clearTimeout(key) {
		const timeout = this.timeouts[key];
		if (timeout) clearTimeout(timeout);
	}
	async getWebhookMethods(rawPath) {
		const path = (0, utils_1.removeTrailingSlash)(rawPath);
		const allKeys = await this.registrations.getAllKeys();
		const webhookMethods = allKeys
			.filter((key) => key.includes(path))
			.map((key) => key.split('|')[0]);
		if (!webhookMethods.length) throw new webhook_not_found_error_1.WebhookNotFoundError({ path });
		return webhookMethods;
	}
	async findAccessControlOptions(path, httpMethod) {
		const allKeys = await this.registrations.getAllKeys();
		const webhookKey = allKeys.find((key) => key.includes(path) && key.startsWith(httpMethod));
		if (!webhookKey) return;
		const registration = await this.registrations.get(webhookKey);
		if (!registration) return;
		const { workflowEntity } = registration;
		const workflow = this.toWorkflow(workflowEntity);
		const webhookNode = Object.values(workflow.nodes).find(
			({ type, parameters, typeVersion }) =>
				parameters?.path === path &&
				(parameters?.httpMethod ?? 'GET') === httpMethod &&
				'webhook' in this.nodeTypes.getByNameAndVersion(type, typeVersion),
		);
		return webhookNode?.parameters?.options;
	}
	async needsWebhook(options) {
		const {
			userId,
			workflowEntity,
			additionalData,
			runData,
			pushRef,
			destinationNode,
			triggerToStartFrom,
		} = options;
		if (!workflowEntity.id)
			throw new workflow_missing_id_error_1.WorkflowMissingIdError(workflowEntity);
		const workflow = this.toWorkflow(workflowEntity);
		let webhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			destinationNode,
			true,
		);
		if (triggerToStartFrom?.data) {
			return false;
		}
		if (triggerToStartFrom) {
			webhooks = webhooks.filter((w) => w.node === triggerToStartFrom.name);
		}
		if (!webhooks.some((w) => w.webhookDescription.restartWebhook !== true)) {
			return false;
		}
		const timeout = setTimeout(
			async () => await this.cancelWebhook(workflow.id),
			constants_1.TEST_WEBHOOK_TIMEOUT,
		);
		for (const webhook of webhooks) {
			const key = this.registrations.toKey(webhook);
			const registrationByKey = await this.registrations.get(key);
			if (runData && webhook.node in runData) {
				return false;
			}
			if (
				registrationByKey &&
				!webhook.webhookId &&
				!registrationByKey.webhook.isTest &&
				registrationByKey.webhook.userId !== userId &&
				registrationByKey.webhook.workflowId !== workflow.id
			) {
				throw new n8n_workflow_1.WebhookPathTakenError(webhook.node);
			}
			webhook.path = (0, utils_1.removeTrailingSlash)(webhook.path);
			webhook.isTest = true;
			const { workflowExecuteAdditionalData: _, ...cacheableWebhook } = webhook;
			cacheableWebhook.userId = userId;
			const registration = {
				pushRef,
				workflowEntity,
				destinationNode,
				webhook: cacheableWebhook,
			};
			try {
				await this.registrations.register(registration);
				await this.webhookService.createWebhookIfNotExists(workflow, webhook, 'manual', 'manual');
				cacheableWebhook.staticData = workflow.staticData;
				await this.registrations.register(registration);
				this.timeouts[key] = timeout;
			} catch (error) {
				await this.deactivateWebhooks(workflow);
				delete this.timeouts[key];
				throw error;
			}
		}
		return true;
	}
	async cancelWebhook(workflowId) {
		let foundWebhook = false;
		const allWebhookKeys = await this.registrations.getAllKeys();
		for (const key of allWebhookKeys) {
			const registration = await this.registrations.get(key);
			if (!registration) continue;
			const { pushRef, workflowEntity } = registration;
			const workflow = this.toWorkflow(workflowEntity);
			if (workflowEntity.id !== workflowId) continue;
			this.clearTimeout(key);
			if (pushRef !== undefined) {
				try {
					this.push.send({ type: 'testWebhookDeleted', data: { workflowId } }, pushRef);
				} catch {}
			}
			if (!foundWebhook) {
				void this.deactivateWebhooks(workflow);
			}
			foundWebhook = true;
		}
		return foundWebhook;
	}
	async getActiveWebhook(httpMethod, path, webhookId) {
		const key = this.registrations.toKey({ httpMethod, path, webhookId });
		let webhook;
		let maxMatches = 0;
		const pathElementsSet = new Set(path.split('/'));
		const registration = await this.registrations.get(key);
		if (!registration) return;
		const { webhook: dynamicWebhook } = registration;
		const staticElements = dynamicWebhook.path.split('/').filter((ele) => !ele.startsWith(':'));
		const allStaticExist = staticElements.every((staticEle) => pathElementsSet.has(staticEle));
		if (allStaticExist && staticElements.length > maxMatches) {
			maxMatches = staticElements.length;
			webhook = dynamicWebhook;
		} else if (staticElements.length === 0 && !webhook) {
			webhook = dynamicWebhook;
		}
		return webhook;
	}
	async deactivateWebhooks(workflow) {
		const allRegistrations = await this.registrations.getAllRegistrations();
		if (!allRegistrations.length) return;
		const webhooksByWorkflow = allRegistrations.reduce((acc, cur) => {
			const { workflowId } = cur.webhook;
			acc[workflowId] ||= [];
			acc[workflowId].push(cur.webhook);
			return acc;
		}, {});
		const webhooks = webhooksByWorkflow[workflow.id];
		if (!webhooks) return;
		for (const webhook of webhooks) {
			const { userId, staticData } = webhook;
			if (userId) {
				webhook.workflowExecuteAdditionalData = await WorkflowExecuteAdditionalData.getBase(userId);
			}
			if (staticData) workflow.staticData = staticData;
			await this.webhookService.deleteWebhook(workflow, webhook, 'internal', 'update');
		}
		await this.registrations.deregisterAll();
	}
	toWorkflow(workflowEntity) {
		return new n8n_workflow_1.Workflow({
			id: workflowEntity.id,
			name: workflowEntity.name,
			nodes: workflowEntity.nodes,
			connections: workflowEntity.connections,
			active: false,
			nodeTypes: this.nodeTypes,
			staticData: {},
			settings: workflowEntity.settings,
		});
	}
};
exports.TestWebhooks = TestWebhooks;
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('clear-test-webhooks', { instanceType: 'main' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	TestWebhooks.prototype,
	'handleClearTestWebhooks',
	null,
);
exports.TestWebhooks = TestWebhooks = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			push_1.Push,
			node_types_1.NodeTypes,
			test_webhook_registrations_service_1.TestWebhookRegistrationsService,
			n8n_core_1.InstanceSettings,
			publisher_service_1.Publisher,
			webhook_service_1.WebhookService,
		]),
	],
	TestWebhooks,
);
//# sourceMappingURL=test-webhooks.js.map
