import { Container } from '@n8n/di';
import { stringify } from 'flatted';
import type { ExecutionHooksOptionalParameters } from 'n8n-core';
import { ErrorReporter, ExecutionLifecycleHooks, Logger, InstanceSettings } from 'n8n-core';
import type {
	IRun,
	IWorkflowBase,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
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

/**
 * Returns hook functions to push data to Editor-UI
 */
function hookFunctionsPush(hooks: ExecutionLifecycleHooks) {
	const logger = Container.get(Logger);
	const pushInstance = Container.get(Push);

	hooks.addCallback('nodeExecuteBefore', async function (nodeName) {
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
	});

	hooks.addCallback('nodeExecuteAfter', async function (nodeName, data) {
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

		pushInstance.send({ type: 'nodeExecuteAfter', data: { executionId, nodeName, data } }, pushRef);
	});

	hooks.addCallback('workflowExecuteBefore', async function (_workflow, data) {
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
	});

	hooks.addCallback('workflowExecuteAfter', async function (fullRunData) {
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
	});
}

function hookFunctionsPreExecute(hooks: ExecutionLifecycleHooks) {
	const externalHooks = Container.get(ExternalHooks);

	hooks.addCallback('workflowExecuteBefore', async function (workflow) {
		await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
	});

	hooks.addCallback('nodeExecuteAfter', async function (nodeName, data, executionData) {
		await saveExecutionProgress(
			this.workflowData,
			this.executionId,
			nodeName,
			data,
			executionData,
			this.pushRef,
		);
	});
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 */
function hookFunctionsSave(hooks: ExecutionLifecycleHooks) {
	const logger = Container.get(Logger);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	const eventService = Container.get(EventService);

	hooks.addCallback('nodeExecuteBefore', async function (nodeName) {
		const { executionId, workflowData: workflow } = this;
		eventService.emit('node-pre-execute', { executionId, workflow, nodeName });
	});

	hooks.addCallback('nodeExecuteAfter', async function (nodeName) {
		const { executionId, workflowData: workflow } = this;
		eventService.emit('node-post-execute', { executionId, workflow, nodeName });
	});

	hooks.addCallback('workflowExecuteAfter', async function (fullRunData, newStaticData) {
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

			const executionStatus = determineFinalExecutionStatus(fullRunData);
			fullRunData.status = executionStatus;

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
				(executionStatus === 'success' && !saveSettings.success) ||
				(executionStatus !== 'success' && !saveSettings.error);

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
				workflowStatusFinal: executionStatus,
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
		} catch (error) {
			Container.get(ErrorReporter).error(error);
			logger.error(`Failed saving execution data to DB on execution ID ${this.executionId}`, {
				executionId: this.executionId,
				workflowId: this.workflowData.id,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				error,
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
	});

	hooks.addCallback('nodeFetchedData', async (workflowId, node) => {
		workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
	});
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 * for running with queues. Manual executions should never run on queues as
 * they are always executed in the main process.
 */
function hookFunctionsSaveWorker(hooks: ExecutionLifecycleHooks) {
	const logger = Container.get(Logger);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
	const eventService = Container.get(EventService);

	hooks.addCallback('nodeExecuteBefore', async function (nodeName) {
		const { executionId, workflowData: workflow } = this;
		eventService.emit('node-pre-execute', { executionId, workflow, nodeName });
	});

	hooks.addCallback('nodeExecuteAfter', async function (nodeName: string) {
		const { executionId, workflowData: workflow } = this;
		eventService.emit('node-post-execute', { executionId, workflow, nodeName });
	});

	hooks.addCallback('workflowExecuteBefore', async function () {
		const { executionId, workflowData } = this;
		eventService.emit('workflow-pre-execute', { executionId, data: workflowData });
	});

	hooks.addCallback(
		'workflowExecuteAfter',
		async function (fullRunData, newStaticData) {
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

				const workflowStatusFinal = determineFinalExecutionStatus(fullRunData);
				fullRunData.status = workflowStatusFinal;

				if (
					!isManualMode &&
					workflowStatusFinal !== 'success' &&
					workflowStatusFinal !== 'waiting'
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
					workflowStatusFinal,
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
			} catch (error) {
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
		async function (runData: IRun) {
			const { executionId, workflowData: workflow } = this;

			eventService.emit('workflow-post-execute', {
				workflow,
				executionId,
				runData,
			});
		},
		async function (fullRunData) {
			const externalHooks = Container.get(ExternalHooks);
			if (externalHooks.exists('workflow.postExecute')) {
				try {
					await externalHooks.run('workflow.postExecute', [
						fullRunData,
						this.workflowData,
						this.executionId,
					]);
				} catch (error) {
					Container.get(ErrorReporter).error(error);
					Container.get(Logger).error(
						'There was a problem running hook "workflow.postExecute"',
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
						error,
					);
				}
			}
		},
	);

	hooks.addCallback('nodeFetchedData', async (workflowId, node) => {
		workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
	});
}

/**
 * Returns ExecutionLifecycleHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getWorkflowHooksIntegrated(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
): ExecutionLifecycleHooks {
	const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData);
	hookFunctionsSave(hooks);
	hookFunctionsPreExecute(hooks);
	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for worker in scaling mode.
 */
export function getWorkflowHooksWorkerExecuter(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	optionalParameters?: ExecutionHooksOptionalParameters,
): ExecutionLifecycleHooks {
	const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData, optionalParameters);
	hookFunctionsSaveWorker(hooks);
	hookFunctionsPreExecute(hooks);

	if (mode === 'manual' && Container.get(InstanceSettings).isWorker) {
		hookFunctionsPush(hooks);
	}

	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for main process if workflow runs via worker
 */
export function getWorkflowHooksWorkerMain(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	optionalParameters?: ExecutionHooksOptionalParameters,
): ExecutionLifecycleHooks {
	const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData, optionalParameters);
	hookFunctionsPreExecute(hooks);

	// TODO: why are workers pushing to frontend?
	// TODO: simplifying this for now to just leave the bare minimum hooks

	// hookFunctionsPush(hooks);
	// hookFunctionsPreExecute(hooks);

	// When running with worker mode, main process executes
	// Only workflowExecuteBefore + workflowExecuteAfter
	// So to avoid confusion, we are removing other hooks.
	hooks.callbacks.nodeExecuteBefore = [];
	hooks.callbacks.nodeExecuteAfter = [];

	hooks.addCallback('workflowExecuteAfter', async function (fullRunData) {
		// Don't delete executions before they are finished
		if (!fullRunData.finished) return;

		const executionStatus = determineFinalExecutionStatus(fullRunData);
		fullRunData.status = executionStatus;

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
			(executionStatus === 'success' && !saveSettings.success) ||
			(executionStatus !== 'success' && !saveSettings.error);

		if (!isManualMode && shouldNotSave && !fullRunData.waitTill) {
			await Container.get(ExecutionRepository).hardDelete({
				workflowId: this.workflowData.id,
				executionId: this.executionId,
			});
		}
	});

	return hooks;
}

/**
 * Returns ExecutionLifecycleHooks instance for running the main workflow
 */
export function getWorkflowHooksMain(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): ExecutionLifecycleHooks {
	const hooks = new ExecutionLifecycleHooks(data.executionMode, executionId, data.workflowData, {
		pushRef: data.pushRef,
		retryOf: data.retryOf,
	});
	hookFunctionsSave(hooks);
	hookFunctionsPush(hooks);
	hookFunctionsPreExecute(hooks);
	return hooks;
}
