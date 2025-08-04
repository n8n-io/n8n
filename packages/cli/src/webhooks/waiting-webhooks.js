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
exports.WaitingWebhooks = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const conflict_error_1 = require('@/errors/response-errors/conflict.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const node_types_1 = require('@/node-types');
const WebhookHelpers = __importStar(require('@/webhooks/webhook-helpers'));
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const webhook_request_sanitizer_1 = require('./webhook-request-sanitizer');
const webhook_service_1 = require('./webhook.service');
let WaitingWebhooks = class WaitingWebhooks {
	constructor(logger, nodeTypes, executionRepository, webhookService) {
		this.logger = logger;
		this.nodeTypes = nodeTypes;
		this.executionRepository = executionRepository;
		this.webhookService = webhookService;
		this.includeForms = false;
	}
	logReceivedWebhook(method, executionId) {
		this.logger.debug(`Received waiting-webhook "${method}" for execution "${executionId}"`);
	}
	disableNode(execution, _method) {
		execution.data.executionData.nodeExecutionStack[0].node.disabled = true;
	}
	isSendAndWaitRequest(nodes, suffix) {
		return (
			suffix &&
			Object.keys(nodes).some(
				(node) =>
					nodes[node].id === suffix &&
					nodes[node].parameters.operation === n8n_workflow_1.SEND_AND_WAIT_OPERATION,
			)
		);
	}
	createWorkflow(workflowData) {
		return new n8n_workflow_1.Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
	}
	async getExecution(executionId) {
		return await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}
	async executeWebhook(req, res) {
		const { path: executionId, suffix } = req.params;
		this.logReceivedWebhook(req.method, executionId);
		(0, webhook_request_sanitizer_1.sanitizeWebhookRequest)(req);
		req.params = {};
		const execution = await this.getExecution(executionId);
		if (!execution) {
			throw new not_found_error_1.NotFoundError(`The execution "${executionId}" does not exist.`);
		}
		if (execution.status === 'running') {
			throw new conflict_error_1.ConflictError(
				`The execution "${executionId}" is running already.`,
			);
		}
		if (execution.data?.resultData?.error) {
			const message = `The execution "${executionId}" has finished with error.`;
			this.logger.debug(message, { error: execution.data.resultData.error });
			throw new conflict_error_1.ConflictError(message);
		}
		if (execution.finished) {
			const { workflowData } = execution;
			const { nodes } = this.createWorkflow(workflowData);
			if (this.isSendAndWaitRequest(nodes, suffix)) {
				res.render('send-and-wait-no-action-required', { isTestWebhook: false });
				return { noWebhookResponse: true };
			} else {
				throw new conflict_error_1.ConflictError(
					`The execution "${executionId} has finished already.`,
				);
			}
		}
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted;
		return await this.getWebhookExecutionData({
			execution,
			req,
			res,
			lastNodeExecuted,
			executionId,
			suffix,
		});
	}
	async getWebhookExecutionData({ execution, req, res, lastNodeExecuted, executionId, suffix }) {
		this.disableNode(execution, req.method);
		execution.data.waitTill = undefined;
		execution.data.resultData.runData[lastNodeExecuted].pop();
		const { workflowData } = execution;
		const workflow = this.createWorkflow(workflowData);
		const workflowStartNode = workflow.getNode(lastNodeExecuted);
		if (workflowStartNode === null) {
			throw new not_found_error_1.NotFoundError('Could not find node to process webhook.');
		}
		const additionalData = await WorkflowExecuteAdditionalData.getBase();
		const webhookData = this.webhookService
			.getNodeWebhooks(workflow, workflowStartNode, additionalData)
			.find(
				(webhook) =>
					webhook.httpMethod === req.method &&
					webhook.path === (suffix ?? '') &&
					webhook.webhookDescription.restartWebhook === true &&
					(webhook.webhookDescription.nodeType === 'form' || false) === this.includeForms,
			);
		if (webhookData === undefined) {
			const errorMessage = `The workflow for execution "${executionId}" does not contain a waiting webhook with a matching path/method.`;
			if (this.isSendAndWaitRequest(workflow.nodes, suffix)) {
				res.render('send-and-wait-no-action-required', { isTestWebhook: false });
				return { noWebhookResponse: true };
			}
			if (!execution.data.resultData.error && execution.status === 'waiting') {
				const childNodes = workflow.getChildNodes(execution.data.resultData.lastNodeExecuted);
				const hasChildForms = childNodes.some(
					(node) =>
						workflow.nodes[node].type === n8n_workflow_1.FORM_NODE_TYPE ||
						workflow.nodes[node].type === n8n_workflow_1.WAIT_NODE_TYPE,
				);
				if (hasChildForms) {
					return { noWebhookResponse: true };
				}
			}
			throw new not_found_error_1.NotFoundError(errorMessage);
		}
		const runExecutionData = execution.data;
		return await new Promise((resolve, reject) => {
			void WebhookHelpers.executeWebhook(
				workflow,
				webhookData,
				workflowData,
				workflowStartNode,
				execution.mode,
				runExecutionData.pushRef,
				runExecutionData,
				execution.id,
				req,
				res,
				(error, data) => {
					if (error !== null) {
						return reject(error);
					}
					resolve(data);
				},
			);
		});
	}
};
exports.WaitingWebhooks = WaitingWebhooks;
exports.WaitingWebhooks = WaitingWebhooks = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			node_types_1.NodeTypes,
			db_1.ExecutionRepository,
			webhook_service_1.WebhookService,
		]),
	],
	WaitingWebhooks,
);
//# sourceMappingURL=waiting-webhooks.js.map
