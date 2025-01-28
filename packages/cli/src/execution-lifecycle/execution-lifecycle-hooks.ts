import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import { ErrorReporter, Logger, InstanceSettings } from 'n8n-core';
import { WorkflowHooks } from 'n8n-workflow';
import type {
	IDataObject,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowBase,
	IWorkflowExecuteHooks,
	IWorkflowHooksOptionalParameters,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
	Workflow,
} from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { Push } from '@/push';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { isWorkflowIdValid } from '@/utils';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { executeErrorWorkflow } from './execute-error-workflow';
import { restoreBinaryDataId } from './restore-binary-data-id';
import { saveExecutionProgress } from './save-execution-progress';
import {
	determineFinalExecutionStatus,
	prepareExecutionDataForDbUpdate,
	updateExistingExecution,
} from './shared/shared-hook-functions';
import { toSaveSettings } from './to-save-settings';

function mergeHookFunctions(...hookFunctions: IWorkflowExecuteHooks[]): IWorkflowExecuteHooks {
	const result: IWorkflowExecuteHooks = {
		nodeExecuteBefore: [],
		nodeExecuteAfter: [],
		workflowExecuteBefore: [],
		workflowExecuteAfter: [],
		sendResponse: [],
		nodeFetchedData: [],
	};
	for (const hooks of hookFunctions) {
		for (const key in hooks) {
			if (!result[key] || !hooks[key]) continue;
			result[key].push(...hooks[key]);
		}
	}
	return result;
}

function hookFunctionsWorkflowEvents(userId?: string): IWorkflowExecuteHooks {
	const eventService = Container.get(EventService);
	return {
		workflowExecuteBefore: [
			async function (this: WorkflowHooks): Promise<void> {
				const { executionId, workflowData } = this;
				eventService.emit('workflow-pre-execute', { executionId, data: workflowData });
			},
		],
		workflowExecuteAfter: [
			async function (this: WorkflowHooks, runData: IRun): Promise<void> {
				const { executionId, workflowData: workflow } = this;
				eventService.emit('workflow-post-execute', { executionId, runData, workflow, userId });
			},
		],
	};
}

function hookFunctionsNodeEvents(): IWorkflowExecuteHooks {
	const eventService = Container.get(EventService);
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				const { executionId, workflowData: workflow } = this;
				eventService.emit('node-pre-execute', { executionId, workflow, nodeName });
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				const { executionId, workflowData: workflow } = this;
				eventService.emit('node-post-execute', { executionId, workflow, nodeName });
			},
		],
	};
}

/**
 * Returns hook functions to push data to Editor-UI
 */
function hookFunctionsPush(): IWorkflowExecuteHooks {
	const logger = Container.get(Logger);
	const pushInstance = Container.get(Push);
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				const { pushRef, executionId } = this;
				// Push data to session which started workflow before each
				// node which starts rendering
				if (pushRef === undefined) {
					return;
				}

				logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
					executionId,
					pushRef,
					workflowId: this.workflowData.id,
				});

				pushInstance.send({ type: 'nodeExecuteBefore', data: { executionId, nodeName } }, pushRef);
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string, data: ITaskData): Promise<void> {
				const { pushRef, executionId } = this;
				// Push data to session which started workflow after each rendered node
				if (pushRef === undefined) {
					return;
				}

				logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
					executionId,
					pushRef,
					workflowId: this.workflowData.id,
				});

				pushInstance.send(
					{ type: 'nodeExecuteAfter', data: { executionId, nodeName, data } },
					pushRef,
				);
			},
		],
		workflowExecuteBefore: [
			async function (this: WorkflowHooks, _workflow, data): Promise<void> {
				const { pushRef, executionId } = this;
				const { id: workflowId, name: workflowName } = this.workflowData;
				logger.debug('Executing hook (hookFunctionsPush)', {
					executionId,
					pushRef,
					workflowId,
				});
				// Push data to session which started the workflow
				if (pushRef === undefined) {
					return;
				}
				pushInstance.send(
					{
						type: 'executionStarted',
						data: {
							executionId,
							mode: this.mode,
							startedAt: new Date(),
							retryOf: this.retryOf,
							workflowId,
							workflowName,
							flattedRunData: data?.resultData.runData
								? stringify(data.resultData.runData)
								: stringify({}),
						},
					},
					pushRef,
				);
			},
		],
		workflowExecuteAfter: [
			async function (this: WorkflowHooks, fullRunData: IRun): Promise<void> {
				const { pushRef, executionId } = this;
				if (pushRef === undefined) return;

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
			},
		],
	};
}

function hookFunctionsPreExecute(): IWorkflowExecuteHooks {
	const externalHooks = Container.get(ExternalHooks);
	return {
		workflowExecuteBefore: [
			async function (this: WorkflowHooks, workflow: Workflow): Promise<void> {
				await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
			},
		],
		nodeExecuteAfter: [
			async function (
				this: WorkflowHooks,
				nodeName: string,
				data: ITaskData,
				executionData: IRunExecutionData,
			): Promise<void> {
				await saveExecutionProgress(
					this.workflowData,
					this.executionId,
					nodeName,
					data,
					executionData,
					this.pushRef,
				);
			},
		],
	};
}

/** This should ideally be added before any other `workflowExecuteAfter` hook to ensure all hooks get the same execution status */
function hookFunctionsFinalizeExecutionStatus(): IWorkflowExecuteHooks {
	return {
		workflowExecuteAfter: [
			async function (fullRunData: IRun) {
				fullRunData.status = determineFinalExecutionStatus(fullRunData);
			},
		],
	};
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 */
function hookFunctionsSave(): IWorkflowExecuteHooks {
	const logger = Container.get(Logger);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	return {
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
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
							await Container.get(WorkflowStaticDataService).saveStaticDataById(
								this.workflowData.id,
								newStaticData,
							);
						} catch (e) {
							Container.get(ErrorReporter).error(e);
							logger.error(
								// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
								`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`,
								{ executionId: this.executionId, workflowId: this.workflowData.id },
							);
						}
					}

					const saveSettings = toSaveSettings(this.workflowData.settings);

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
						await Container.get(ExecutionRepository).softDelete(this.executionId);

						return;
					}

					const shouldNotSave =
						(fullRunData.status === 'success' && !saveSettings.success) ||
						(fullRunData.status !== 'success' && !saveSettings.error);

					if (shouldNotSave && !fullRunData.waitTill && !isManualMode) {
						executeErrorWorkflow(
							this.workflowData,
							fullRunData,
							this.mode,
							this.executionId,
							this.retryOf,
						);

						await Container.get(ExecutionRepository).hardDelete({
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
						retryOf: this.retryOf,
					});

					// When going into the waiting state, store the pushRef in the execution-data
					if (fullRunData.waitTill && isManualMode) {
						fullExecutionData.data.pushRef = this.pushRef;
					}

					await updateExistingExecution({
						executionId: this.executionId,
						workflowId: this.workflowData.id,
						executionData: fullExecutionData,
					});

					if (!isManualMode) {
						executeErrorWorkflow(
							this.workflowData,
							fullRunData,
							this.mode,
							this.executionId,
							this.retryOf,
						);
					}
				} finally {
					workflowStatisticsService.emit('workflowExecutionCompleted', {
						workflowData: this.workflowData,
						fullRunData,
					});
				}
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
			},
		],
	};
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 * for running with queues. Manual executions should never run on queues as
 * they are always executed in the main process.
 */
function hookFunctionsSaveWorker(): IWorkflowExecuteHooks {
	const logger = Container.get(Logger);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	return {
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				logger.debug('Executing hook (hookFunctionsSaveWorker)', {
					executionId: this.executionId,
					workflowId: this.workflowData.id,
				});

				const isManualMode = this.mode === 'manual';

				try {
					if (!isManualMode && isWorkflowIdValid(this.workflowData.id) && newStaticData) {
						// Workflow is saved so update in database
						try {
							await Container.get(WorkflowStaticDataService).saveStaticDataById(
								this.workflowData.id,
								newStaticData,
							);
						} catch (e) {
							Container.get(ErrorReporter).error(e);
							logger.error(
								// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
								`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`,
								{ pushRef: this.pushRef, workflowId: this.workflowData.id },
							);
						}
					}

					if (
						!isManualMode &&
						fullRunData.status !== 'success' &&
						fullRunData.status !== 'waiting'
					) {
						executeErrorWorkflow(
							this.workflowData,
							fullRunData,
							this.mode,
							this.executionId,
							this.retryOf,
						);
					}

					// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
					// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
					const fullExecutionData = prepareExecutionDataForDbUpdate({
						runData: fullRunData,
						workflowData: this.workflowData,
						workflowStatusFinal: fullRunData.status,
						retryOf: this.retryOf,
					});

					// When going into the waiting state, store the pushRef in the execution-data
					if (fullRunData.waitTill && isManualMode) {
						fullExecutionData.data.pushRef = this.pushRef;
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
			},
			async function (this: WorkflowHooks, fullRunData: IRun) {
				const externalHooks = Container.get(ExternalHooks);
				try {
					await externalHooks.run('workflow.postExecute', [
						fullRunData,
						this.workflowData,
						this.executionId,
					]);
				} catch {}
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
			},
		],
	};
}

/**
 * Returns WorkflowHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getWorkflowHooksIntegrated(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	userId?: string,
): WorkflowHooks {
	const hookFunctions = mergeHookFunctions(
		hookFunctionsWorkflowEvents(userId),
		hookFunctionsNodeEvents(),
		hookFunctionsFinalizeExecutionStatus(),
		hookFunctionsSave(),
		hookFunctionsPreExecute(),
	);
	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData);
}

/**
 * Returns WorkflowHooks instance for worker in scaling mode.
 */
export function getWorkflowHooksWorkerExecuter(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	optionalParameters: IWorkflowHooksOptionalParameters = {},
): WorkflowHooks {
	const toMerge = [
		hookFunctionsNodeEvents(),
		hookFunctionsFinalizeExecutionStatus(),
		hookFunctionsSaveWorker(),
		hookFunctionsPreExecute(),
	];

	if (mode === 'manual' && Container.get(InstanceSettings).isWorker) {
		toMerge.push(hookFunctionsPush());
	}

	const hookFunctions = mergeHookFunctions(...toMerge);
	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}

/**
 * Returns WorkflowHooks instance for main process if workflow runs via worker
 */
export function getWorkflowHooksWorkerMain(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	optionalParameters: IWorkflowHooksOptionalParameters = {},
): WorkflowHooks {
	const hookFunctions = mergeHookFunctions(
		hookFunctionsWorkflowEvents(),
		hookFunctionsPreExecute(),
		hookFunctionsFinalizeExecutionStatus(),
		{
			workflowExecuteAfter: [
				async function (this: WorkflowHooks, fullRunData: IRun): Promise<void> {
					// Don't delete executions before they are finished
					if (!fullRunData.finished) return;

					const saveSettings = toSaveSettings(this.workflowData.settings);

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
						await Container.get(ExecutionRepository).softDelete(this.executionId);

						return;
					}

					const shouldNotSave =
						(fullRunData.status === 'success' && !saveSettings.success) ||
						(fullRunData.status !== 'success' && !saveSettings.error);

					if (!isManualMode && shouldNotSave && !fullRunData.waitTill) {
						await Container.get(ExecutionRepository).hardDelete({
							workflowId: this.workflowData.id,
							executionId: this.executionId,
						});
					}
				},
			],
		},
	);

	// When running with worker mode, main process executes
	// Only workflowExecuteBefore + workflowExecuteAfter
	// So to avoid confusion, we are removing other hooks.
	hookFunctions.nodeExecuteBefore = [];
	hookFunctions.nodeExecuteAfter = [];

	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}

/**
 * Returns WorkflowHooks instance for running the main workflow
 */
export function getWorkflowHooksMain(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): WorkflowHooks {
	const hookFunctions = mergeHookFunctions(
		hookFunctionsWorkflowEvents(),
		hookFunctionsNodeEvents(),
		hookFunctionsFinalizeExecutionStatus(),
		hookFunctionsSave(),
		hookFunctionsPush(),
		hookFunctionsPreExecute(),
	);
	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, {
		pushRef: data.pushRef,
		retryOf: data.retryOf as string,
	});
}
