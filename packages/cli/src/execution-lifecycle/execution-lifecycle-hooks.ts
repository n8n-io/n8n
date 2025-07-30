import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { LifecycleMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { stringify } from 'flatted';
import { ErrorReporter, InstanceSettings, ExecutionLifecycleHooks } from 'n8n-core';
import type {
	IWorkflowBase,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { isWorkflowIdValid } from '@/utils';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

// eslint-disable-next-line import-x/no-cycle
import { executeErrorWorkflow } from './execute-error-workflow';
import { restoreBinaryDataId } from './restore-binary-data-id';
import { saveExecutionProgress } from './save-execution-progress';
import {
	determineFinalExecutionStatus,
	prepareExecutionDataForDbUpdate,
	updateExistingExecution,
} from './shared/shared-hook-functions';
import { type ExecutionSaveSettings, toSaveSettings } from './to-save-settings';

@Service()
class ModulesHooksRegistry {
	addHooks(hooks: ExecutionLifecycleHooks) {
		const handlers = Container.get(LifecycleMetadata).getHandlers();

		for (const { handlerClass, methodName, eventName } of handlers) {
			const instance = Container.get(handlerClass);

			switch (eventName) {
				case 'workflowExecuteAfter':
					hooks.addHandler(eventName, async function (runData, newStaticData) {
						const context = {
							type: 'workflowExecuteAfter',
							workflow: this.workflowData,
							runData,
							newStaticData,
						};
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return await instance[methodName].call(instance, context);
					});
					break;
			}
		}
	}
}

type HooksSetupParameters = {
	saveSettings: ExecutionSaveSettings;
	pushRef?: string;
	retryOf?: string;
};

function hookFunctionsWorkflowEvents(hooks: ExecutionLifecycleHooks, userId?: string) {
	const eventService = Container.get(EventService);
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

function hookFunctionsNodeEvents(hooks: ExecutionLifecycleHooks) {
	const eventService = Container.get(EventService);
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

/**
 * Returns hook functions to push data to Editor-UI
 */
function hookFunctionsPush(
	hooks: ExecutionLifecycleHooks,
	{ pushRef, retryOf }: HooksSetupParameters,
) {
	if (!pushRef) return;
	const logger = Container.get(Logger);
	const pushInstance = Container.get(Push);
	hooks.addHandler('nodeExecuteBefore', function (nodeName, data) {
		const { executionId } = this;
		// Push data to session which started workflow before each
		// node which starts rendering
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
		// Push data to session which started workflow after each rendered node
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
		// Push data to session which started the workflow
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
						? stringify(data.resultData.runData)
						: stringify({}),
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
			const rawData = stringify(fullRunData.data);
			pushInstance.send(
				{ type: 'executionFinished', data: { executionId, workflowId, status, rawData } },
				pushRef,
			);
		}
	});
}

function hookFunctionsExternalHooks(hooks: ExecutionLifecycleHooks) {
	const externalHooks = Container.get(ExternalHooks);
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

function hookFunctionsSaveProgress(
	hooks: ExecutionLifecycleHooks,
	{ saveSettings }: HooksSetupParameters,
) {
	if (!saveSettings.progress) return;
	hooks.addHandler('nodeExecuteAfter', async function (nodeName, data, executionData) {
		await saveExecutionProgress(
			this.workflowData.id,
			this.executionId,
			nodeName,
			data,
			executionData,
		);
	});
}

/** This should ideally be added before any other `workflowExecuteAfter` hook to ensure all hooks get the same execution status */
function hookFunctionsFinalizeExecutionStatus(hooks: ExecutionLifecycleHooks) {
	hooks.addHandler('workflowExecuteAfter', (fullRunData) => {
		fullRunData.status = determineFinalExecutionStatus(fullRunData);
	});
}

function hookFunctionsStatistics(hooks: ExecutionLifecycleHooks) {
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	hooks.addHandler('nodeFetchedData', (workflowId, node) => {
		workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
	});
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 */
function hookFunctionsSave(
	hooks: ExecutionLifecycleHooks,
	{ pushRef, retryOf, saveSettings }: HooksSetupParameters,
) {
	const logger = Container.get(Logger);
	const errorReporter = Container.get(ErrorReporter);
	const executionRepository = Container.get(ExecutionRepository);
	const workflowStaticDataService = Container.get(WorkflowStaticDataService);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	hooks.addHandler('workflowExecuteAfter', async function (fullRunData, newStaticData) {
		logger.debug('Executing hook (hookFunctionsSave)', {
			executionId: this.executionId,
			workflowId: this.workflowData.id,
		});

		await restoreBinaryDataId(fullRunData, this.executionId, this.mode);

		const isManualMode = this.mode === 'manual';

		try {
			if (!isManualMode && isWorkflowIdValid(this.workflowData.id) && newStaticData) {
				// Workflow is saved so update in database
				try {
					await workflowStaticDataService.saveStaticDataById(this.workflowData.id, newStaticData);
				} catch (e) {
					errorReporter.error(e);
					logger.error(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`,
						{ executionId: this.executionId, workflowId: this.workflowData.id },
					);
				}
			}

			if (isManualMode && !saveSettings.manual && !fullRunData.waitTill) {
				/**
				 * When manual executions are not being saved, we only soft-delete
				 * the execution so that the user can access its binary data
				 * while building their workflow.
				 *
				 * The manual execution and its binary data will be hard-deleted
				 * on the next pruning cycle after the grace period set by
				 * `EXECUTIONS_DATA_HARD_DELETE_BUFFER`.
				 */
				await executionRepository.softDelete(this.executionId);

				return;
			}

			const shouldNotSave =
				(fullRunData.status === 'success' && !saveSettings.success) ||
				(fullRunData.status !== 'success' && !saveSettings.error);

			if (shouldNotSave && !fullRunData.waitTill && !isManualMode) {
				executeErrorWorkflow(this.workflowData, fullRunData, this.mode, this.executionId, retryOf);

				await executionRepository.hardDelete({
					workflowId: this.workflowData.id,
					executionId: this.executionId,
				});

				return;
			}

			// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
			// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
			const fullExecutionData = prepareExecutionDataForDbUpdate({
				runData: fullRunData,
				workflowData: this.workflowData,
				workflowStatusFinal: fullRunData.status,
				retryOf,
			});

			// When going into the waiting state, store the pushRef in the execution-data
			if (fullRunData.waitTill && isManualMode) {
				fullExecutionData.data.pushRef = pushRef;
			}

			await updateExistingExecution({
				executionId: this.executionId,
				workflowId: this.workflowData.id,
				executionData: fullExecutionData,
			});

			if (!isManualMode) {
				executeErrorWorkflow(this.workflowData, fullRunData, this.mode, this.executionId, retryOf);
			}
		} finally {
			workflowStatisticsService.emit('workflowExecutionCompleted', {
				workflowData: this.workflowData,
				fullRunData,
			});
		}
	});
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 * for running with queues. Manual executions should never run on queues as
 * they are always executed in the main process.
 */
function hookFunctionsSaveWorker(
	hooks: ExecutionLifecycleHooks,
	{ pushRef, retryOf }: HooksSetupParameters,
) {
	const logger = Container.get(Logger);
	const errorReporter = Container.get(ErrorReporter);
	const workflowStaticDataService = Container.get(WorkflowStaticDataService);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	hooks.addHandler('workflowExecuteAfter', async function (fullRunData, newStaticData) {
		logger.debug('Executing hook (hookFunctionsSaveWorker)', {
			executionId: this.executionId,
			workflowId: this.workflowData.id,
		});

		const isManualMode = this.mode === 'manual';

		try {
			if (!isManualMode && isWorkflowIdValid(this.workflowData.id) && newStaticData) {
				// Workflow is saved so update in database
				try {
					await workflowStaticDataService.saveStaticDataById(this.workflowData.id, newStaticData);
				} catch (e) {
					errorReporter.error(e);
					logger.error(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
						`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`,
						{ workflowId: this.workflowData.id },
					);
				}
			}

			if (!isManualMode && fullRunData.status !== 'success' && fullRunData.status !== 'waiting') {
				executeErrorWorkflow(this.workflowData, fullRunData, this.mode, this.executionId, retryOf);
			}

			// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
			// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
			const fullExecutionData = prepareExecutionDataForDbUpdate({
				runData: fullRunData,
				workflowData: this.workflowData,
				workflowStatusFinal: fullRunData.status,
				retryOf,
			});

			// When going into the waiting state, store the pushRef in the execution-data
			if (fullRunData.waitTill && isManualMode) {
				fullExecutionData.data.pushRef = pushRef;
			}

			await updateExistingExecution({
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

/**
 * Returns ExecutionLifecycleHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getLifecycleHooksForSubExecutions(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	userId?: string,
): ExecutionLifecycleHooks {
	const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
	const saveSettings = toSaveSettings(workflowData.settings);
	hookFunctionsWorkflowEvents(hooks, userId);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSave(hooks, { saveSettings });
	hookFunctionsSaveProgress(hooks, { saveSettings });
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for worker in scaling mode.
 */
export function getLifecycleHooksForScalingWorker(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): ExecutionLifecycleHooks {
	const { pushRef, retryOf, executionMode, workflowData } = data;
	const hooks = new ExecutionLifecycleHooks(executionMode, executionId, workflowData);
	const saveSettings = toSaveSettings(workflowData.settings);
	const optionalParameters = { pushRef, retryOf: retryOf ?? undefined, saveSettings };
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSaveWorker(hooks, optionalParameters);
	hookFunctionsSaveProgress(hooks, optionalParameters);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);

	if (executionMode === 'manual' && Container.get(InstanceSettings).isWorker) {
		hookFunctionsPush(hooks, optionalParameters);
	}

	Container.get(ModulesHooksRegistry).addHooks(hooks);

	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for main process in scaling mode.
 */
export function getLifecycleHooksForScalingMain(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): ExecutionLifecycleHooks {
	const { pushRef, retryOf, executionMode, workflowData, userId } = data;
	const hooks = new ExecutionLifecycleHooks(executionMode, executionId, workflowData);
	const saveSettings = toSaveSettings(workflowData.settings);
	const optionalParameters = { pushRef, retryOf: retryOf ?? undefined, saveSettings };
	const executionRepository = Container.get(ExecutionRepository);

	hookFunctionsWorkflowEvents(hooks, userId);
	hookFunctionsSaveProgress(hooks, optionalParameters);
	hookFunctionsExternalHooks(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);

	hooks.addHandler('workflowExecuteAfter', async function (fullRunData) {
		// Don't delete executions before they are finished
		if (!fullRunData.finished) return;

		const isManualMode = this.mode === 'manual';

		if (isManualMode && !saveSettings.manual && !fullRunData.waitTill) {
			/**
			 * When manual executions are not being saved, we only soft-delete
			 * the execution so that the user can access its binary data
			 * while building their workflow.
			 *
			 * The manual execution and its binary data will be hard-deleted
			 * on the next pruning cycle after the grace period set by
			 * `EXECUTIONS_DATA_HARD_DELETE_BUFFER`.
			 */
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

	// When running with worker mode, main process executes
	// Only workflowExecuteBefore + workflowExecuteAfter
	// So to avoid confusion, we are removing other hooks.
	hooks.handlers.nodeExecuteBefore = [];
	hooks.handlers.nodeExecuteAfter = [];

	Container.get(ModulesHooksRegistry).addHooks(hooks);

	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for the main process in regular mode
 */
export function getLifecycleHooksForRegularMain(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): ExecutionLifecycleHooks {
	const { pushRef, retryOf, executionMode, workflowData, userId } = data;
	const hooks = new ExecutionLifecycleHooks(executionMode, executionId, workflowData);
	const saveSettings = toSaveSettings(workflowData.settings);
	const optionalParameters = { pushRef, retryOf: retryOf ?? undefined, saveSettings };
	hookFunctionsWorkflowEvents(hooks, userId);
	hookFunctionsNodeEvents(hooks);
	hookFunctionsFinalizeExecutionStatus(hooks);
	hookFunctionsSave(hooks, optionalParameters);
	hookFunctionsPush(hooks, optionalParameters);
	hookFunctionsSaveProgress(hooks, optionalParameters);
	hookFunctionsStatistics(hooks);
	hookFunctionsExternalHooks(hooks);
	Container.get(ModulesHooksRegistry).addHooks(hooks);
	return hooks;
}
