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
Object.defineProperty(exports, '__esModule', { value: true });
exports.getLifecycleHooksForSubExecutions = getLifecycleHooksForSubExecutions;
exports.getLifecycleHooksForScalingWorker = getLifecycleHooksForScalingWorker;
exports.getLifecycleHooksForScalingMain = getLifecycleHooksForScalingMain;
exports.getLifecycleHooksForRegularMain = getLifecycleHooksForRegularMain;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const flatted_1 = require('flatted');
const n8n_core_1 = require('n8n-core');
const event_service_1 = require('@/events/event.service');
const external_hooks_1 = require('@/external-hooks');
const push_1 = require('@/push');
const workflow_statistics_service_1 = require('@/services/workflow-statistics.service');
const utils_1 = require('@/utils');
const workflow_static_data_service_1 = require('@/workflows/workflow-static-data.service');
const execute_error_workflow_1 = require('./execute-error-workflow');
const restore_binary_data_id_1 = require('./restore-binary-data-id');
const save_execution_progress_1 = require('./save-execution-progress');
const shared_hook_functions_1 = require('./shared/shared-hook-functions');
const to_save_settings_1 = require('./to-save-settings');
let ModulesHooksRegistry = class ModulesHooksRegistry {
	addHooks(hooks) {
		const handlers = di_1.Container.get(decorators_1.LifecycleMetadata).getHandlers();
		for (const { handlerClass, methodName, eventName } of handlers) {
			const instance = di_1.Container.get(handlerClass);
			switch (eventName) {
				case 'workflowExecuteAfter':
					hooks.addHandler(eventName, async function (runData, newStaticData) {
						const context = {
							type: 'workflowExecuteAfter',
							workflow: this.workflowData,
							runData,
							newStaticData,
						};
						return await instance[methodName].call(instance, context);
					});
					break;
				case 'nodeExecuteBefore':
					hooks.addHandler(eventName, async function (nodeName, taskData) {
						const context = {
							type: 'nodeExecuteBefore',
							workflow: this.workflowData,
							nodeName,
							taskData,
						};
						return await instance[methodName].call(instance, context);
					});
					break;
				case 'nodeExecuteAfter':
					hooks.addHandler(eventName, async function (nodeName, taskData, executionData) {
						const context = {
							type: 'nodeExecuteAfter',
							workflow: this.workflowData,
							nodeName,
							taskData,
							executionData,
						};
						return await instance[methodName].call(instance, context);
					});
					break;
				case 'workflowExecuteBefore':
					hooks.addHandler(eventName, async function (workflowInstance, executionData) {
						const context = {
							type: 'workflowExecuteBefore',
							workflow: this.workflowData,
							workflowInstance,
							executionData,
						};
						return await instance[methodName].call(instance, context);
					});
					break;
			}
		}
	}
};
ModulesHooksRegistry = __decorate([(0, di_1.Service)()], ModulesHooksRegistry);
function hookFunctionsWorkflowEvents(hooks, userId) {
	const eventService = di_1.Container.get(event_service_1.EventService);
	hooks.addHandler('workflowExecuteBefore', function () {
		const { executionId, workflowData } = this;
		eventService.emit('workflow-pre-execute', { executionId, data: workflowData });
	});
	hooks.addHandler('workflowExecuteAfter', function (runData) {
		if (runData.status === 'waiting') return;
		const { executionId, workflowData: workflow } = this;
		if (runData.data.startData) {
			const originalDestination = runData.data.startData.originalDestinationNode;
			if (originalDestination) {
				runData.data.startData.destinationNode = originalDestination;
				runData.data.startData.originalDestinationNode = undefined;
			}
		}
		eventService.emit('workflow-post-execute', { executionId, runData, workflow, userId });
	});
}
function hookFunctionsNodeEvents(hooks) {
	const eventService = di_1.Container.get(event_service_1.EventService);
	hooks.addHandler('nodeExecuteBefore', function (nodeName) {
		const { executionId, workflowData: workflow } = this;
		const node = workflow.nodes.find((n) => n.name === nodeName);
		eventService.emit('node-pre-execute', {
			executionId,
			workflow,
			nodeId: node?.id,
			nodeName,
			nodeType: node?.type,
		});
	});
	hooks.addHandler('nodeExecuteAfter', function (nodeName) {
		const { executionId, workflowData: workflow } = this;
		const node = workflow.nodes.find((n) => n.name === nodeName);
		eventService.emit('node-post-execute', {
			executionId,
			workflow,
			nodeId: node?.id,
			nodeName,
			nodeType: node?.type,
		});
	});
}
function hookFunctionsPush(hooks, { pushRef, retryOf }) {
	if (!pushRef) return;
	const logger = di_1.Container.get(backend_common_1.Logger);
	const pushInstance = di_1.Container.get(push_1.Push);
	hooks.addHandler('nodeExecuteBefore', function (nodeName, data) {
		const { executionId } = this;
		logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
			executionId,
			pushRef,
			workflowId: this.workflowData.id,
		});
		pushInstance.send(
			{ type: 'nodeExecuteBefore', data: { executionId, nodeName, data } },
			pushRef,
		);
	});
	hooks.addHandler('nodeExecuteAfter', function (nodeName, data) {
		const { executionId } = this;
		logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
			executionId,
			pushRef,
			workflowId: this.workflowData.id,
		});
		pushInstance.send({ type: 'nodeExecuteAfter', data: { executionId, nodeName, data } }, pushRef);
	});
	hooks.addHandler('workflowExecuteBefore', function (_workflow, data) {
		const { executionId } = this;
		const { id: workflowId, name: workflowName } = this.workflowData;
		logger.debug('Executing hook (hookFunctionsPush)', {
			executionId,
			pushRef,
			workflowId,
		});
		pushInstance.send(
			{
				type: 'executionStarted',
				data: {
					executionId,
					mode: this.mode,
					startedAt: new Date(),
					retryOf,
					workflowId,
					workflowName,
					flattedRunData: data?.resultData.runData
						? (0, flatted_1.stringify)(data.resultData.runData)
						: (0, flatted_1.stringify)({}),
				},
			},
			pushRef,
		);
	});
	hooks.addHandler('workflowExecuteAfter', function (fullRunData) {
		const { executionId } = this;
		const { id: workflowId } = this.workflowData;
		logger.debug('Executing hook (hookFunctionsPush)', {
			executionId,
			pushRef,
			workflowId,
		});
		const { status } = fullRunData;
		if (status === 'waiting') {
			pushInstance.send({ type: 'executionWaiting', data: { executionId } }, pushRef);
		} else {
			const rawData = (0, flatted_1.stringify)(fullRunData.data);
			pushInstance.send(
				{ type: 'executionFinished', data: { executionId, workflowId, status, rawData } },
				pushRef,
			);
		}
	});
}
function hookFunctionsExternalHooks(hooks) {
	const externalHooks = di_1.Container.get(external_hooks_1.ExternalHooks);
	hooks.addHandler('workflowExecuteBefore', async function (workflow) {
		await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
	});
	hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
		await externalHooks.run('workflow.postExecute', [
			fullRunData,
			this.workflowData,
			this.executionId,
		]);
	});
}
function hookFunctionsSaveProgress(hooks, { saveSettings }) {
	if (!saveSettings.progress) return;
	hooks.addHandler('nodeExecuteAfter', async function (nodeName, data, executionData) {
		await (0, save_execution_progress_1.saveExecutionProgress)(
			this.workflowData.id,
			this.executionId,
			nodeName,
			data,
			executionData,
		);
	});
}
function hookFunctionsFinalizeExecutionStatus(hooks) {
	hooks.addHandler('workflowExecuteAfter', (fullRunData) => {
		fullRunData.status = (0, shared_hook_functions_1.determineFinalExecutionStatus)(fullRunData);
	});
}
function hookFunctionsStatistics(hooks) {
	const workflowStatisticsService = di_1.Container.get(
		workflow_statistics_service_1.WorkflowStatisticsService,
	);
	hooks.addHandler('nodeFetchedData', (workflowId, node) => {
		workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
	});
}
function hookFunctionsSave(hooks, { pushRef, retryOf, saveSettings }) {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const errorReporter = di_1.Container.get(n8n_core_1.ErrorReporter);
	const executionRepository = di_1.Container.get(db_1.ExecutionRepository);
	const workflowStaticDataService = di_1.Container.get(
		workflow_static_data_service_1.WorkflowStaticDataService,
	);
	const workflowStatisticsService = di_1.Container.get(
		workflow_statistics_service_1.WorkflowStatisticsService,
	);
	hooks.addHandler('workflowExecuteAfter', async function (fullRunData, newStaticData) {
		logger.debug('Executing hook (hookFunctionsSave)', {
			executionId: this.executionId,
			workflowId: this.workflowData.id,
		});
		await (0, restore_binary_data_id_1.restoreBinaryDataId)(
			fullRunData,
			this.executionId,
			this.mode,
		);
		const isManualMode = this.mode === 'manual';
		try {
			if (!isManualMode && (0, utils_1.isWorkflowIdValid)(this.workflowData.id) && newStaticData) {
				try {
					await workflowStaticDataService.saveStaticDataById(this.workflowData.id, newStaticData);
				} catch (e) {
					errorReporter.error(e);
					logger.error(
						`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`,
						{ executionId: this.executionId, workflowId: this.workflowData.id },
					);
				}
			}
			if (isManualMode && !saveSettings.manual && !fullRunData.waitTill) {
				await executionRepository.softDelete(this.executionId);
				return;
			}
			const shouldNotSave =
				(fullRunData.status === 'success' && !saveSettings.success) ||
				(fullRunData.status !== 'success' && !saveSettings.error);
			if (shouldNotSave && !fullRunData.waitTill && !isManualMode) {
				(0, execute_error_workflow_1.executeErrorWorkflow)(
					this.workflowData,
					fullRunData,
					this.mode,
					this.executionId,
					retryOf,
				);
				await executionRepository.hardDelete({
					workflowId: this.workflowData.id,
					executionId: this.executionId,
				});
				return;
			}
			const fullExecutionData = (0, shared_hook_functions_1.prepareExecutionDataForDbUpdate)({
				runData: fullRunData,
				workflowData: this.workflowData,
				workflowStatusFinal: fullRunData.status,
				retryOf,
			});
			if (fullRunData.waitTill && isManualMode) {
				fullExecutionData.data.pushRef = pushRef;
			}
			await (0, shared_hook_functions_1.updateExistingExecution)({
				executionId: this.executionId,
				workflowId: this.workflowData.id,
				executionData: fullExecutionData,
			});
			if (!isManualMode) {
				(0, execute_error_workflow_1.executeErrorWorkflow)(
					this.workflowData,
					fullRunData,
					this.mode,
					this.executionId,
					retryOf,
				);
			}
		} finally {
			workflowStatisticsService.emit('workflowExecutionCompleted', {
				workflowData: this.workflowData,
				fullRunData,
			});
		}
	});
}
function hookFunctionsSaveWorker(hooks, { pushRef, retryOf }) {
	const logger = di_1.Container.get(backend_common_1.Logger);
	const errorReporter = di_1.Container.get(n8n_core_1.ErrorReporter);
	const workflowStaticDataService = di_1.Container.get(
		workflow_static_data_service_1.WorkflowStaticDataService,
	);
	const workflowStatisticsService = di_1.Container.get(
		workflow_statistics_service_1.WorkflowStatisticsService,
	);
	hooks.addHandler('workflowExecuteAfter', async function (fullRunData, newStaticData) {
		logger.debug('Executing hook (hookFunctionsSaveWorker)', {
			executionId: this.executionId,
			workflowId: this.workflowData.id,
		});
		const isManualMode = this.mode === 'manual';
		try {
			if (!isManualMode && (0, utils_1.isWorkflowIdValid)(this.workflowData.id) && newStaticData) {
				try {
					await workflowStaticDataService.saveStaticDataById(this.workflowData.id, newStaticData);
				} catch (e) {
					errorReporter.error(e);
					logger.error(
						`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`,
						{ workflowId: this.workflowData.id },
					);
				}
			}
			if (!isManualMode && fullRunData.status !== 'success' && fullRunData.status !== 'waiting') {
				(0, execute_error_workflow_1.executeErrorWorkflow)(
					this.workflowData,
					fullRunData,
					this.mode,
					this.executionId,
					retryOf,
				);
			}
			const fullExecutionData = (0, shared_hook_functions_1.prepareExecutionDataForDbUpdate)({
				runData: fullRunData,
				workflowData: this.workflowData,
				workflowStatusFinal: fullRunData.status,
				retryOf,
			});
			if (fullRunData.waitTill && isManualMode) {
				fullExecutionData.data.pushRef = pushRef;
			}
			await (0, shared_hook_functions_1.updateExistingExecution)({
				executionId: this.executionId,
				workflowId: this.workflowData.id,
				executionData: fullExecutionData,
			});
		} finally {
			workflowStatisticsService.emit('workflowExecutionCompleted', {
				workflowData: this.workflowData,
				fullRunData,
			});
		}
	});
}
function getLifecycleHooksForSubExecutions(mode, executionId, workflowData, userId) {
	const hooks = new n8n_core_1.ExecutionLifecycleHooks(mode, executionId, workflowData);
	const saveSettings = (0, to_save_settings_1.toSaveSettings)(workflowData.settings);
	hookFunctionsWorkflowEvents(hooks, userId);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSave(hooks, { saveSettings });
	hookFunctionsSaveProgress(hooks, { saveSettings });
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	return hooks;
}
function getLifecycleHooksForScalingWorker(data, executionId) {
	const { pushRef, retryOf, executionMode, workflowData } = data;
	const hooks = new n8n_core_1.ExecutionLifecycleHooks(executionMode, executionId, workflowData);
	const saveSettings = (0, to_save_settings_1.toSaveSettings)(workflowData.settings);
	const optionalParameters = { pushRef, retryOf: retryOf ?? undefined, saveSettings };
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSaveWorker(hooks, optionalParameters);
	hookFunctionsSaveProgress(hooks, optionalParameters);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	if (executionMode === 'manual' && di_1.Container.get(n8n_core_1.InstanceSettings).isWorker) {
		hookFunctionsPush(hooks, optionalParameters);
	}
	di_1.Container.get(ModulesHooksRegistry).addHooks(hooks);
	return hooks;
}
function getLifecycleHooksForScalingMain(data, executionId) {
	const { pushRef, retryOf, executionMode, workflowData, userId } = data;
	const hooks = new n8n_core_1.ExecutionLifecycleHooks(executionMode, executionId, workflowData);
	const saveSettings = (0, to_save_settings_1.toSaveSettings)(workflowData.settings);
	const optionalParameters = { pushRef, retryOf: retryOf ?? undefined, saveSettings };
	const executionRepository = di_1.Container.get(db_1.ExecutionRepository);
	hookFunctionsWorkflowEvents(hooks, userId);
	hookFunctionsSaveProgress(hooks, optionalParameters);
	hookFunctionsExternalHooks(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
		if (!fullRunData.finished) return;
		const isManualMode = this.mode === 'manual';
		if (isManualMode && !saveSettings.manual && !fullRunData.waitTill) {
			await executionRepository.softDelete(this.executionId);
			return;
		}
		const shouldNotSave =
			(fullRunData.status === 'success' && !saveSettings.success) ||
			(fullRunData.status !== 'success' && !saveSettings.error);
		if (!isManualMode && shouldNotSave && !fullRunData.waitTill) {
			await executionRepository.hardDelete({
				workflowId: this.workflowData.id,
				executionId: this.executionId,
			});
		}
	});
	hooks.handlers.nodeExecuteBefore = [];
	hooks.handlers.nodeExecuteAfter = [];
	di_1.Container.get(ModulesHooksRegistry).addHooks(hooks);
	return hooks;
}
function getLifecycleHooksForRegularMain(data, executionId) {
	const { pushRef, retryOf, executionMode, workflowData, userId } = data;
	const hooks = new n8n_core_1.ExecutionLifecycleHooks(executionMode, executionId, workflowData);
	const saveSettings = (0, to_save_settings_1.toSaveSettings)(workflowData.settings);
	const optionalParameters = { pushRef, retryOf: retryOf ?? undefined, saveSettings };
	hookFunctionsWorkflowEvents(hooks, userId);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSave(hooks, optionalParameters);
	hookFunctionsPush(hooks, optionalParameters);
	hookFunctionsSaveProgress(hooks, optionalParameters);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	di_1.Container.get(ModulesHooksRegistry).addHooks(hooks);
	return hooks;
}
//# sourceMappingURL=execution-lifecycle-hooks.js.map
