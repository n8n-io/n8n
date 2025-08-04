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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ActiveWorkflowManager = void 0;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const chunk_1 = __importDefault(require('lodash/chunk'));
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_assert_1 = require('node:assert');
const activation_errors_service_1 = require('@/activation-errors.service');
const active_executions_1 = require('@/active-executions');
const constants_1 = require('@/constants');
const execute_error_workflow_1 = require('@/execution-lifecycle/execute-error-workflow');
const execution_service_1 = require('@/executions/execution.service');
const external_hooks_1 = require('@/external-hooks');
const node_types_1 = require('@/node-types');
const push_1 = require('@/push');
const publisher_service_1 = require('@/scaling/pubsub/publisher.service');
const active_workflows_service_1 = require('@/services/active-workflows.service');
const WebhookHelpers = __importStar(require('@/webhooks/webhook-helpers'));
const webhook_service_1 = require('@/webhooks/webhook.service');
const WorkflowExecuteAdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const workflow_execution_service_1 = require('@/workflows/workflow-execution.service');
const workflow_static_data_service_1 = require('@/workflows/workflow-static-data.service');
const workflow_formatter_1 = require('@/workflows/workflow.formatter');
let ActiveWorkflowManager = class ActiveWorkflowManager {
	constructor(
		logger,
		errorReporter,
		activeWorkflows,
		activeExecutions,
		externalHooks,
		nodeTypes,
		webhookService,
		workflowRepository,
		activationErrorsService,
		executionService,
		workflowStaticDataService,
		activeWorkflowsService,
		workflowExecutionService,
		instanceSettings,
		publisher,
		workflowsConfig,
		push,
	) {
		this.logger = logger;
		this.errorReporter = errorReporter;
		this.activeWorkflows = activeWorkflows;
		this.activeExecutions = activeExecutions;
		this.externalHooks = externalHooks;
		this.nodeTypes = nodeTypes;
		this.webhookService = webhookService;
		this.workflowRepository = workflowRepository;
		this.activationErrorsService = activationErrorsService;
		this.executionService = executionService;
		this.workflowStaticDataService = workflowStaticDataService;
		this.activeWorkflowsService = activeWorkflowsService;
		this.workflowExecutionService = workflowExecutionService;
		this.instanceSettings = instanceSettings;
		this.publisher = publisher;
		this.workflowsConfig = workflowsConfig;
		this.push = push;
		this.queuedActivations = {};
		this.logger = this.logger.scoped(['workflow-activation']);
	}
	async init() {
		(0, node_assert_1.strict)(
			this.instanceSettings.instanceRole !== 'unset',
			'Active workflow manager expects instance role to be set',
		);
		await this.addActiveWorkflows('init');
		await this.externalHooks.run('activeWorkflows.initialized');
	}
	async getAllWorkflowActivationErrors() {
		return await this.activationErrorsService.getAll();
	}
	async removeAll() {
		let activeWorkflowIds = [];
		this.logger.debug('Call to remove all active workflows received (removeAll)');
		activeWorkflowIds.push(...this.activeWorkflows.allActiveWorkflows());
		const activeWorkflows = await this.activeWorkflowsService.getAllActiveIdsInStorage();
		activeWorkflowIds = [...activeWorkflowIds, ...activeWorkflows];
		activeWorkflowIds = Array.from(new Set(activeWorkflowIds));
		const removePromises = [];
		for (const workflowId of activeWorkflowIds) {
			removePromises.push(this.remove(workflowId));
		}
		await Promise.all(removePromises);
	}
	allActiveInMemory() {
		return this.activeWorkflows.allActiveWorkflows();
	}
	async isActive(workflowId) {
		const workflow = await this.workflowRepository.findOne({
			select: ['active'],
			where: { id: workflowId },
		});
		return !!workflow?.active;
	}
	async addWebhooks(workflow, additionalData, mode, activation) {
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		let path = '';
		if (webhooks.length === 0) return false;
		for (const webhookData of webhooks) {
			const node = workflow.getNode(webhookData.node);
			node.name = webhookData.node;
			path = webhookData.path;
			const webhook = this.webhookService.createWebhook({
				workflowId: webhookData.workflowId,
				webhookPath: path,
				node: node.name,
				method: webhookData.httpMethod,
			});
			if (webhook.webhookPath.startsWith('/')) {
				webhook.webhookPath = webhook.webhookPath.slice(1);
			}
			if (webhook.webhookPath.endsWith('/')) {
				webhook.webhookPath = webhook.webhookPath.slice(0, -1);
			}
			if ((path.startsWith(':') || path.includes('/:')) && node.webhookId) {
				webhook.webhookId = node.webhookId;
				webhook.pathLength = webhook.webhookPath.split('/').length;
			}
			try {
				await this.webhookService.storeWebhook(webhook);
				await this.webhookService.createWebhookIfNotExists(workflow, webhookData, mode, activation);
			} catch (error) {
				if (activation === 'init' && error.name === 'QueryFailedError') {
					continue;
				}
				try {
					await this.clearWebhooks(workflow.id);
				} catch (error1) {
					this.errorReporter.error(error1);
					this.logger.error(
						`Could not remove webhooks of workflow "${workflow.id}" because of error: "${error1.message}"`,
					);
				}
				if (error instanceof Error && error.name === 'QueryFailedError') {
					error = new n8n_workflow_1.WebhookPathTakenError(webhook.node, error);
				} else if (error.detail) {
					error.message = error.detail;
				}
				throw error;
			}
		}
		await this.webhookService.populateCache();
		await this.workflowStaticDataService.saveStaticData(workflow);
		this.logger.debug(`Added webhooks for workflow "${workflow.name}" (ID ${workflow.id})`, {
			workflowId: workflow.id,
		});
		return true;
	}
	async clearWebhooks(workflowId) {
		const workflowData = await this.workflowRepository.findOne({
			where: { id: workflowId },
		});
		if (workflowData === null) {
			throw new n8n_workflow_1.UnexpectedError('Could not find workflow', {
				extra: { workflowId },
			});
		}
		const workflow = new n8n_workflow_1.Workflow({
			id: workflowId,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
		const mode = 'internal';
		const additionalData = await WorkflowExecuteAdditionalData.getBase();
		const webhooks = WebhookHelpers.getWorkflowWebhooks(workflow, additionalData, undefined, true);
		for (const webhookData of webhooks) {
			await this.webhookService.deleteWebhook(workflow, webhookData, mode, 'update');
		}
		await this.workflowStaticDataService.saveStaticData(workflow);
		await this.webhookService.deleteWorkflowWebhooks(workflowId);
	}
	getExecutePollFunctions(workflowData, additionalData, mode, activation) {
		return (workflow, node) => {
			const __emit = (data, responsePromise, donePromise) => {
				this.logger.debug(`Received event to trigger execution for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);
				const executePromise = this.workflowExecutionService.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);
				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					void executePromise.catch((error) => this.logger.error(error.message, { error }));
				}
			};
			const __emitError = (error) => {
				void this.executionService
					.createErrorExecution(error, node, workflowData, workflow, mode)
					.then(() => {
						this.executeErrorWorkflow(error, workflowData, mode);
					});
			};
			return new n8n_core_1.PollContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				__emit,
				__emitError,
			);
		};
	}
	getExecuteTriggerFunctions(workflowData, additionalData, mode, activation) {
		return (workflow, node) => {
			const emit = (data, responsePromise, donePromise) => {
				this.logger.debug(`Received trigger for workflow "${workflow.name}"`);
				void this.workflowStaticDataService.saveStaticData(workflow);
				const executePromise = this.workflowExecutionService.runWorkflow(
					workflowData,
					node,
					data,
					additionalData,
					mode,
					responsePromise,
				);
				if (donePromise) {
					void executePromise.then((executionId) => {
						this.activeExecutions
							.getPostExecutePromise(executionId)
							.then(donePromise.resolve)
							.catch(donePromise.reject);
					});
				} else {
					executePromise.catch((error) => this.logger.error(error.message, { error }));
				}
			};
			const emitError = (error) => {
				this.logger.info(
					`The trigger node "${node.name}" of workflow "${workflowData.name}" failed with the error: "${error.message}". Will try to reactivate.`,
					{
						nodeName: node.name,
						workflowId: workflowData.id,
						workflowName: workflowData.name,
					},
				);
				void this.activeWorkflows.remove(workflowData.id);
				void this.activationErrorsService.register(workflowData.id, error.message);
				const activationError = new n8n_workflow_1.WorkflowActivationError(
					`There was a problem with the trigger node "${node.name}", for that reason did the workflow had to be deactivated`,
					{ cause: error, node },
				);
				this.executeErrorWorkflow(activationError, workflowData, mode);
				this.addQueuedWorkflowActivation(activation, workflowData);
			};
			return new n8n_core_1.TriggerContext(
				workflow,
				node,
				additionalData,
				mode,
				activation,
				emit,
				emitError,
			);
		};
	}
	executeErrorWorkflow(error, workflowData, mode) {
		const fullRunData = {
			data: {
				resultData: {
					error,
					runData: {},
				},
			},
			finished: false,
			mode,
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'running',
		};
		(0, execute_error_workflow_1.executeErrorWorkflow)(workflowData, fullRunData, mode);
	}
	async addActiveWorkflows(activationMode) {
		const dbWorkflowIds = await this.workflowRepository.getAllActiveIds();
		if (dbWorkflowIds.length === 0) return;
		if (this.instanceSettings.isLeader) {
			this.logger.info('Start Active Workflows:');
		}
		const batches = (0, chunk_1.default)(dbWorkflowIds, this.workflowsConfig.activationBatchSize);
		for (const batch of batches) {
			const activationPromises = batch.map(async (dbWorkflowId) => {
				await this.activateWorkflow(dbWorkflowId, activationMode);
			});
			await Promise.all(activationPromises);
		}
		this.logger.debug('Finished activating all workflows');
	}
	async activateWorkflow(workflowId, activationMode) {
		const dbWorkflow = await this.workflowRepository.findById(workflowId);
		if (!dbWorkflow) return;
		try {
			const added = await this.add(dbWorkflow.id, activationMode, dbWorkflow, {
				shouldPublish: false,
			});
			if (added.webhooks || added.triggersAndPollers) {
				this.logger.info(
					`Activated workflow ${(0, workflow_formatter_1.formatWorkflow)(dbWorkflow)}`,
					{
						workflowName: dbWorkflow.name,
						workflowId: dbWorkflow.id,
					},
				);
			}
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				`Issue on initial workflow activation try of ${(0, workflow_formatter_1.formatWorkflow)(dbWorkflow)} (startup)`,
				{
					error,
					workflowName: dbWorkflow.name,
					workflowId: dbWorkflow.id,
				},
			);
			this.executeErrorWorkflow(error, dbWorkflow, 'internal');
			if (error.message.includes('Authorization')) return;
			this.addQueuedWorkflowActivation('init', dbWorkflow);
		}
	}
	async clearAllActivationErrors() {
		this.logger.debug('Clearing all activation errors');
		await this.activationErrorsService.clearAll();
	}
	async addAllTriggerAndPollerBasedWorkflows() {
		await this.addActiveWorkflows('leadershipChange');
	}
	async removeAllTriggerAndPollerBasedWorkflows() {
		await this.activeWorkflows.removeAllTriggerAndPollerBasedWorkflows();
	}
	async add(
		workflowId,
		activationMode,
		existingWorkflow,
		{ shouldPublish } = { shouldPublish: true },
	) {
		const added = { webhooks: false, triggersAndPollers: false };
		if (this.instanceSettings.isMultiMain && shouldPublish) {
			void this.publisher.publishCommand({
				command: 'add-webhooks-triggers-and-pollers',
				payload: { workflowId },
			});
			return added;
		}
		let workflow;
		const shouldAddWebhooks = this.shouldAddWebhooks(activationMode);
		const shouldAddTriggersAndPollers = this.shouldAddTriggersAndPollers();
		try {
			const dbWorkflow = existingWorkflow ?? (await this.workflowRepository.findById(workflowId));
			if (!dbWorkflow) {
				throw new n8n_workflow_1.WorkflowActivationError(
					`Failed to find workflow with ID "${workflowId}"`,
					{
						level: 'warning',
					},
				);
			}
			if (['init', 'leadershipChange'].includes(activationMode) && !dbWorkflow.active) {
				this.logger.debug(
					`Skipping workflow ${(0, workflow_formatter_1.formatWorkflow)(dbWorkflow)} as it is no longer active`,
					{ workflowId: dbWorkflow.id },
				);
				return added;
			}
			workflow = new n8n_workflow_1.Workflow({
				id: dbWorkflow.id,
				name: dbWorkflow.name,
				nodes: dbWorkflow.nodes,
				connections: dbWorkflow.connections,
				active: dbWorkflow.active,
				nodeTypes: this.nodeTypes,
				staticData: dbWorkflow.staticData,
				settings: dbWorkflow.settings,
			});
			const canBeActivated = this.checkIfWorkflowCanBeActivated(
				workflow,
				constants_1.STARTING_NODES,
			);
			if (!canBeActivated) {
				throw new n8n_workflow_1.WorkflowActivationError(
					`Workflow ${(0, workflow_formatter_1.formatWorkflow)(dbWorkflow)} has no node to start the workflow - at least one trigger, poller or webhook node is required`,
					{ level: 'warning' },
				);
			}
			const additionalData = await WorkflowExecuteAdditionalData.getBase();
			if (shouldAddWebhooks) {
				added.webhooks = await this.addWebhooks(
					workflow,
					additionalData,
					'trigger',
					activationMode,
				);
			}
			if (shouldAddTriggersAndPollers) {
				added.triggersAndPollers = await this.addTriggersAndPollers(dbWorkflow, workflow, {
					activationMode,
					executionMode: 'trigger',
					additionalData,
				});
			}
			this.removeQueuedWorkflowActivation(workflowId);
			await this.activationErrorsService.deregister(workflowId);
			const triggerCount = this.countTriggers(workflow, additionalData);
			await this.workflowRepository.updateWorkflowTriggerCount(workflow.id, triggerCount);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			await this.activationErrorsService.register(workflowId, error.message);
			throw e;
		}
		await this.workflowStaticDataService.saveStaticData(workflow);
		return added;
	}
	handleDisplayWorkflowActivation({ workflowId }) {
		this.push.broadcast({ type: 'workflowActivated', data: { workflowId } });
	}
	handleDisplayWorkflowDeactivation({ workflowId }) {
		this.push.broadcast({ type: 'workflowDeactivated', data: { workflowId } });
	}
	handleDisplayWorkflowActivationError({ workflowId, errorMessage }) {
		this.push.broadcast({
			type: 'workflowFailedToActivate',
			data: { workflowId, errorMessage },
		});
	}
	async handleAddWebhooksTriggersAndPollers({ workflowId }) {
		try {
			await this.add(workflowId, 'activate', undefined, {
				shouldPublish: false,
			});
			this.push.broadcast({ type: 'workflowActivated', data: { workflowId } });
			await this.publisher.publishCommand({
				command: 'display-workflow-activation',
				payload: { workflowId },
			});
		} catch (e) {
			const error = (0, n8n_workflow_1.ensureError)(e);
			const { message } = error;
			await this.workflowRepository.update(workflowId, { active: false });
			this.push.broadcast({
				type: 'workflowFailedToActivate',
				data: { workflowId, errorMessage: message },
			});
			await this.publisher.publishCommand({
				command: 'display-workflow-activation-error',
				payload: { workflowId, errorMessage: message },
			});
		}
	}
	checkIfWorkflowCanBeActivated(workflow, ignoreNodeTypes) {
		let node;
		let nodeType;
		for (const nodeName of Object.keys(workflow.nodes)) {
			node = workflow.nodes[nodeName];
			if (node.disabled === true) {
				continue;
			}
			if (ignoreNodeTypes !== undefined && ignoreNodeTypes.includes(node.type)) {
				continue;
			}
			nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			if (nodeType === undefined) {
				continue;
			}
			if (
				nodeType.poll !== undefined ||
				nodeType.trigger !== undefined ||
				nodeType.webhook !== undefined
			) {
				return true;
			}
		}
		return false;
	}
	countTriggers(workflow, additionalData) {
		const triggerFilter = (nodeType) =>
			!!nodeType.trigger && !nodeType.description.name.includes('manualTrigger');
		const workflowWebhooks = WebhookHelpers.getWorkflowWebhooks(
			workflow,
			additionalData,
			undefined,
			true,
		);
		const uniqueWebhooks = workflowWebhooks.reduce((acc, webhook) => {
			acc.add(webhook.node);
			return acc;
		}, new Set());
		return (
			workflow.queryNodes(triggerFilter).length +
			workflow.getPollNodes().length +
			uniqueWebhooks.size
		);
	}
	addQueuedWorkflowActivation(activationMode, workflowData) {
		const workflowId = workflowData.id;
		const workflowName = workflowData.name;
		const retryFunction = async () => {
			this.logger.info(`Try to activate workflow "${workflowName}" (${workflowId})`, {
				workflowId,
				workflowName,
			});
			try {
				await this.add(workflowId, activationMode, workflowData);
			} catch (error) {
				this.errorReporter.error(error);
				let lastTimeout = this.queuedActivations[workflowId].lastTimeout;
				if (lastTimeout < constants_1.WORKFLOW_REACTIVATE_MAX_TIMEOUT) {
					lastTimeout = Math.min(lastTimeout * 2, constants_1.WORKFLOW_REACTIVATE_MAX_TIMEOUT);
				}
				this.logger.info(
					`Activation of workflow "${workflowName}" (${workflowId}) did fail with error: "${error.message}" | retry in ${Math.floor(lastTimeout / 1000)} seconds`,
					{
						error,
						workflowId,
						workflowName,
					},
				);
				this.queuedActivations[workflowId].lastTimeout = lastTimeout;
				this.queuedActivations[workflowId].timeout = setTimeout(retryFunction, lastTimeout);
				return;
			}
			this.logger.info(`Activation of workflow "${workflowName}" (${workflowId}) was successful!`, {
				workflowId,
				workflowName,
			});
		};
		this.removeQueuedWorkflowActivation(workflowId);
		this.queuedActivations[workflowId] = {
			activationMode,
			lastTimeout: constants_1.WORKFLOW_REACTIVATE_INITIAL_TIMEOUT,
			timeout: setTimeout(retryFunction, constants_1.WORKFLOW_REACTIVATE_INITIAL_TIMEOUT),
			workflowData,
		};
	}
	removeQueuedWorkflowActivation(workflowId) {
		if (this.queuedActivations[workflowId]) {
			clearTimeout(this.queuedActivations[workflowId].timeout);
			delete this.queuedActivations[workflowId];
		}
	}
	removeAllQueuedWorkflowActivations() {
		for (const workflowId in this.queuedActivations) {
			this.removeQueuedWorkflowActivation(workflowId);
		}
	}
	async remove(workflowId) {
		if (this.instanceSettings.isMultiMain) {
			try {
				await this.clearWebhooks(workflowId);
			} catch (error) {
				this.errorReporter.error(error);
				this.logger.error(
					`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
				);
			}
			void this.publisher.publishCommand({
				command: 'remove-triggers-and-pollers',
				payload: { workflowId },
			});
			return;
		}
		try {
			await this.clearWebhooks(workflowId);
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error(
				`Could not remove webhooks of workflow "${workflowId}" because of error: "${error.message}"`,
			);
		}
		await this.activationErrorsService.deregister(workflowId);
		if (this.queuedActivations[workflowId] !== undefined) {
			this.removeQueuedWorkflowActivation(workflowId);
		}
		await this.removeWorkflowTriggersAndPollers(workflowId);
	}
	async handleRemoveTriggersAndPollers({ workflowId }) {
		await this.removeActivationError(workflowId);
		await this.removeWorkflowTriggersAndPollers(workflowId);
		this.push.broadcast({ type: 'workflowDeactivated', data: { workflowId } });
		await this.publisher.publishCommand({
			command: 'display-workflow-deactivation',
			payload: { workflowId },
		});
	}
	async removeWorkflowTriggersAndPollers(workflowId) {
		if (!this.activeWorkflows.isActive(workflowId)) return;
		const wasRemoved = await this.activeWorkflows.remove(workflowId);
		if (wasRemoved) {
			this.logger.debug(`Removed triggers and pollers for workflow "${workflowId}"`, {
				workflowId,
			});
		}
	}
	async addTriggersAndPollers(
		dbWorkflow,
		workflow,
		{ activationMode, executionMode, additionalData },
	) {
		const getTriggerFunctions = this.getExecuteTriggerFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
		);
		const getPollFunctions = this.getExecutePollFunctions(
			dbWorkflow,
			additionalData,
			executionMode,
			activationMode,
		);
		if (workflow.getTriggerNodes().length === 0 && workflow.getPollNodes().length === 0) {
			return false;
		}
		await this.activeWorkflows.add(
			workflow.id,
			workflow,
			additionalData,
			executionMode,
			activationMode,
			getTriggerFunctions,
			getPollFunctions,
		);
		this.logger.debug(
			`Added triggers and pollers for workflow ${(0, workflow_formatter_1.formatWorkflow)(dbWorkflow)}`,
		);
		return true;
	}
	async removeActivationError(workflowId) {
		await this.activationErrorsService.deregister(workflowId);
	}
	shouldAddWebhooks(activationMode) {
		if (activationMode === 'init') return true;
		if (activationMode === 'leadershipChange') return false;
		return this.instanceSettings.isLeader;
	}
	shouldAddTriggersAndPollers() {
		return this.instanceSettings.isLeader;
	}
};
exports.ActiveWorkflowManager = ActiveWorkflowManager;
__decorate(
	[
		(0, decorators_1.OnLeaderTakeover)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	ActiveWorkflowManager.prototype,
	'addAllTriggerAndPollerBasedWorkflows',
	null,
);
__decorate(
	[
		(0, decorators_1.OnLeaderStepdown)(),
		(0, decorators_1.OnShutdown)(),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', []),
		__metadata('design:returntype', Promise),
	],
	ActiveWorkflowManager.prototype,
	'removeAllTriggerAndPollerBasedWorkflows',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('display-workflow-activation', { instanceType: 'main' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	ActiveWorkflowManager.prototype,
	'handleDisplayWorkflowActivation',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('display-workflow-deactivation', { instanceType: 'main' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	ActiveWorkflowManager.prototype,
	'handleDisplayWorkflowDeactivation',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('display-workflow-activation-error', { instanceType: 'main' }),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', void 0),
	],
	ActiveWorkflowManager.prototype,
	'handleDisplayWorkflowActivationError',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('add-webhooks-triggers-and-pollers', {
			instanceType: 'main',
			instanceRole: 'leader',
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ActiveWorkflowManager.prototype,
	'handleAddWebhooksTriggersAndPollers',
	null,
);
__decorate(
	[
		(0, decorators_1.OnPubSubEvent)('remove-triggers-and-pollers', {
			instanceType: 'main',
			instanceRole: 'leader',
		}),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	ActiveWorkflowManager.prototype,
	'handleRemoveTriggersAndPollers',
	null,
);
exports.ActiveWorkflowManager = ActiveWorkflowManager = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			n8n_core_1.ErrorReporter,
			n8n_core_1.ActiveWorkflows,
			active_executions_1.ActiveExecutions,
			external_hooks_1.ExternalHooks,
			node_types_1.NodeTypes,
			webhook_service_1.WebhookService,
			db_1.WorkflowRepository,
			activation_errors_service_1.ActivationErrorsService,
			execution_service_1.ExecutionService,
			workflow_static_data_service_1.WorkflowStaticDataService,
			active_workflows_service_1.ActiveWorkflowsService,
			workflow_execution_service_1.WorkflowExecutionService,
			n8n_core_1.InstanceSettings,
			publisher_service_1.Publisher,
			config_1.WorkflowsConfig,
			push_1.Push,
		]),
	],
	ActiveWorkflowManager,
);
//# sourceMappingURL=active-workflow-manager.js.map
