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
Object.defineProperty(exports, '__esModule', { value: true });
exports.getRunData = getRunData;
exports.getWorkflowData = getWorkflowData;
exports.executeWorkflow = executeWorkflow;
exports.setExecutionStatus = setExecutionStatus;
exports.sendDataToUI = sendDataToUI;
exports.getBase = getBase;
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const active_executions_1 = require('@/active-executions');
const credentials_helper_1 = require('@/credentials-helper');
const event_service_1 = require('@/events/event.service');
const execution_lifecycle_hooks_1 = require('@/execution-lifecycle/execution-lifecycle-hooks');
const execution_data_service_1 = require('@/executions/execution-data.service');
const pre_execution_checks_1 = require('@/executions/pre-execution-checks');
const node_types_1 = require('@/node-types');
const push_1 = require('@/push');
const url_service_1 = require('@/services/url.service');
const task_requester_1 = require('@/task-runners/task-managers/task-requester');
const utils_1 = require('@/utils');
const object_to_error_1 = require('@/utils/object-to-error');
const WorkflowHelpers = __importStar(require('@/workflow-helpers'));
async function getRunData(workflowData, inputData, parentExecution) {
	const mode = 'integrated';
	const startingNode = (0, utils_1.findSubworkflowStart)(workflowData.nodes);
	inputData = inputData || [
		{
			json: {},
		},
	];
	const nodeExecutionStack = [];
	nodeExecutionStack.push({
		node: startingNode,
		data: {
			main: [inputData],
		},
		metadata: { parentExecution },
		source: null,
	});
	const runExecutionData = {
		startData: {},
		resultData: {
			runData: {},
		},
		executionData: {
			contextData: {},
			metadata: {},
			nodeExecutionStack,
			waitingExecution: {},
			waitingExecutionSource: {},
		},
		parentExecution,
	};
	return {
		executionMode: mode,
		executionData: runExecutionData,
		workflowData,
	};
}
async function getWorkflowData(workflowInfo, parentWorkflowId, parentWorkflowSettings) {
	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new n8n_workflow_1.UnexpectedError(
			'No information about the workflow to execute found. Please provide either the "id" or "code"!',
		);
	}
	let workflowData;
	if (workflowInfo.id !== undefined) {
		const relations = di_1.Container.get(config_1.GlobalConfig).tags.disabled ? [] : ['tags'];
		workflowData = await di_1.Container.get(db_1.WorkflowRepository).get(
			{ id: workflowInfo.id },
			{ relations },
		);
		if (workflowData === undefined || workflowData === null) {
			throw new n8n_workflow_1.UnexpectedError('Workflow does not exist.', {
				extra: { workflowId: workflowInfo.id },
			});
		}
	} else {
		workflowData = workflowInfo.code ?? null;
		if (workflowData) {
			if (!workflowData.id) {
				workflowData.id = parentWorkflowId;
			}
			if (!workflowData.settings) {
				workflowData.settings = parentWorkflowSettings;
			}
		}
	}
	return workflowData;
}
async function executeWorkflow(workflowInfo, additionalData, options) {
	const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
	const workflowData =
		options.loadedWorkflowData ??
		(await getWorkflowData(workflowInfo, options.parentWorkflowId, options.parentWorkflowSettings));
	const runData =
		options.loadedRunData ??
		(await getRunData(workflowData, options.inputData, options.parentExecution));
	const executionId = await activeExecutions.add(runData);
	const executionPromise = startExecution(
		additionalData,
		options,
		executionId,
		runData,
		workflowData,
	);
	if (options.doNotWaitToFinish) {
		return { executionId, data: [null] };
	}
	return await executionPromise;
}
async function startExecution(additionalData, options, executionId, runData, workflowData) {
	const nodeTypes = di_1.Container.get(node_types_1.NodeTypes);
	const activeExecutions = di_1.Container.get(active_executions_1.ActiveExecutions);
	const executionRepository = di_1.Container.get(db_1.ExecutionRepository);
	const workflowName = workflowData ? workflowData.name : undefined;
	const workflow = new n8n_workflow_1.Workflow({
		id: workflowData.id,
		name: workflowName,
		nodes: workflowData.nodes,
		connections: workflowData.connections,
		active: workflowData.active,
		nodeTypes,
		staticData: workflowData.staticData,
		settings: workflowData.settings,
	});
	await executionRepository.setRunning(executionId);
	const startTime = Date.now();
	let data;
	try {
		await di_1.Container.get(pre_execution_checks_1.CredentialsPermissionChecker).check(
			workflowData.id,
			workflowData.nodes,
		);
		await di_1.Container.get(pre_execution_checks_1.SubworkflowPolicyChecker).check(
			workflow,
			options.parentWorkflowId,
			options.node,
			additionalData.userId,
		);
		const additionalDataIntegrated = await getBase();
		additionalDataIntegrated.hooks = (0,
		execution_lifecycle_hooks_1.getLifecycleHooksForSubExecutions)(
			runData.executionMode,
			executionId,
			workflowData,
			additionalData.userId,
		);
		additionalDataIntegrated.executionId = executionId;
		additionalDataIntegrated.parentCallbackManager = options.parentCallbackManager;
		additionalDataIntegrated.executeWorkflow = additionalData.executeWorkflow;
		if (additionalData.httpResponse) {
			additionalDataIntegrated.httpResponse = additionalData.httpResponse;
		}
		additionalDataIntegrated.streamingEnabled = additionalData.streamingEnabled;
		let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
		const workflowSettings = workflowData.settings;
		if (workflowSettings?.executionTimeout !== undefined && workflowSettings.executionTimeout > 0) {
			subworkflowTimeout = Math.min(
				additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER,
				startTime + workflowSettings.executionTimeout * 1000,
			);
		}
		additionalDataIntegrated.executionTimeoutTimestamp = subworkflowTimeout;
		const runExecutionData = runData.executionData;
		const workflowExecute = new n8n_core_1.WorkflowExecute(
			additionalDataIntegrated,
			runData.executionMode,
			runExecutionData,
		);
		const execution = workflowExecute.processRunExecutionData(workflow);
		activeExecutions.attachWorkflowExecution(executionId, execution);
		data = await execution;
	} catch (error) {
		const executionError = error;
		const fullRunData = di_1.Container.get(
			execution_data_service_1.ExecutionDataService,
		).generateFailedExecutionFromError(
			runData.executionMode,
			executionError,
			'node' in executionError ? executionError.node : undefined,
			startTime,
		);
		const fullExecutionData = {
			data: fullRunData.data,
			mode: fullRunData.mode,
			finished: fullRunData.finished ? fullRunData.finished : false,
			startedAt: fullRunData.startedAt,
			stoppedAt: fullRunData.stoppedAt,
			status: fullRunData.status,
			workflowData,
			workflowId: workflowData.id,
		};
		if (workflowData.id) {
			fullExecutionData.workflowId = workflowData.id;
		}
		activeExecutions.finalizeExecution(executionId, fullRunData);
		await executionRepository.updateExistingExecution(executionId, fullExecutionData);
		throw (0, object_to_error_1.objectToError)(
			{
				...executionError,
				executionId,
				workflowId: workflowData.id,
				stack: executionError?.stack,
				message: executionError?.message,
			},
			workflow,
		);
	}
	if (data.finished === true || data.status === 'waiting') {
		activeExecutions.finalizeExecution(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return {
			executionId,
			data: returnData.data.main,
			waitTill: data.waitTill,
		};
	}
	activeExecutions.finalizeExecution(executionId, data);
	const { error } = data.data.resultData;
	throw (0, object_to_error_1.objectToError)(
		{
			...error,
			executionId,
			workflowId: workflowData.id,
			stack: error?.stack,
		},
		workflow,
	);
}
function setExecutionStatus(status) {
	const logger = di_1.Container.get(backend_common_1.Logger);
	if (this.executionId === undefined) {
		logger.debug(`Setting execution status "${status}" failed because executionId is undefined`);
		return;
	}
	logger.debug(`Setting execution status for ${this.executionId} to "${status}"`);
	di_1.Container.get(active_executions_1.ActiveExecutions).setStatus(this.executionId, status);
}
function sendDataToUI(type, data) {
	const { pushRef } = this;
	if (pushRef === undefined) {
		return;
	}
	try {
		const pushInstance = di_1.Container.get(push_1.Push);
		pushInstance.send({ type, data }, pushRef);
	} catch (error) {
		const logger = di_1.Container.get(backend_common_1.Logger);
		logger.warn(`There was a problem sending message to UI: ${error.message}`);
	}
}
async function getBase(userId, currentNodeParameters, executionTimeoutTimestamp) {
	const urlBaseWebhook = di_1.Container.get(url_service_1.UrlService).getWebhookBaseUrl();
	const globalConfig = di_1.Container.get(config_1.GlobalConfig);
	const variables = await WorkflowHelpers.getVariables();
	const eventService = di_1.Container.get(event_service_1.EventService);
	return {
		currentNodeExecutionIndex: 0,
		credentialsHelper: di_1.Container.get(credentials_helper_1.CredentialsHelper),
		executeWorkflow,
		restApiUrl: urlBaseWebhook + globalConfig.endpoints.rest,
		instanceBaseUrl: urlBaseWebhook,
		formWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.formWaiting,
		webhookBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhook,
		webhookWaitingBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhookWaiting,
		webhookTestBaseUrl: urlBaseWebhook + globalConfig.endpoints.webhookTest,
		currentNodeParameters,
		executionTimeoutTimestamp,
		userId,
		setExecutionStatus,
		variables,
		async getRunExecutionData(executionId) {
			const executionRepository = di_1.Container.get(db_1.ExecutionRepository);
			const executionData = await executionRepository.findSingleExecution(executionId, {
				unflattenData: true,
				includeData: true,
			});
			return executionData?.data;
		},
		externalSecretsProxy: di_1.Container.get(n8n_core_1.ExternalSecretsProxy),
		async startRunnerTask(
			additionalData,
			jobType,
			settings,
			executeFunctions,
			inputData,
			node,
			workflow,
			runExecutionData,
			runIndex,
			itemIndex,
			activeNodeName,
			connectionInputData,
			siblingParameters,
			mode,
			envProviderState,
			executeData,
		) {
			return await di_1.Container.get(task_requester_1.TaskRequester).startTask(
				additionalData,
				jobType,
				settings,
				executeFunctions,
				inputData,
				node,
				workflow,
				runExecutionData,
				runIndex,
				itemIndex,
				activeNodeName,
				connectionInputData,
				siblingParameters,
				mode,
				envProviderState,
				executeData,
			);
		},
		logAiEvent: (eventName, payload) => eventService.emit(eventName, payload),
	};
}
//# sourceMappingURL=workflow-execute-additional-data.js.map
