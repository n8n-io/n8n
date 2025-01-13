import { Service } from '@n8n/di';
import { stringify } from 'flatted';
import { pick } from 'lodash';
import type { ExecutionHooksOptionalParameters } from 'n8n-core';
import { ErrorReporter, ExecutionLifecycleHooks, InstanceSettings, Logger } from 'n8n-core';
import type {
	IRun,
	ExecutionStatus,
	WorkflowExecuteMode,
	IWorkflowBase,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { ensureError } from 'n8n-workflow';

import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import type { IExecutionDb, UpdateExecutionPayload } from '@/interfaces';
import { Push } from '@/push';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { isWorkflowIdValid } from '@/utils';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { restoreBinaryDataId } from './restore-binary-data-id';
import { saveExecutionProgress } from './save-execution-progress';
import { determineFinalExecutionStatus } from './shared/shared-hook-functions';
import { toSaveSettings } from './to-save-settings';

@Service()
export class ExecutionLifecycleHooksFactory {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly executionRepository: ExecutionRepository,
		private readonly externalHooks: ExternalHooks,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly executionMetadataService: ExecutionMetadataService,
		private readonly eventService: EventService,
		private readonly push: Push,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/** Returns internal hooks for running a workflow in the main process in regular mode. */
	forMainProcess(
		{ executionMode, workflowData, pushRef, retryOf }: IWorkflowExecutionDataProcess,
		executionId: string,
	) {
		const hooks = new ExecutionLifecycleHooks(executionMode, executionId, workflowData, {
			pushRef,
			retryOf,
		});
		this.addPreExecuteHooks(hooks);
		this.addEventHooks(hooks);
		this.addSavingHooks(hooks, false);
		this.addPushHooks(hooks);
		return hooks;
	}

	/** Returns ExecutionLifecycleHooks instance for main process if workflow runs via worker */
	forExecutionOnWorker(
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
		optionalParameters: ExecutionHooksOptionalParameters = {},
	) {
		const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData, optionalParameters);
		this.addPreExecuteHooks(hooks);
		this.addEventHooks(hooks);
		if (mode === 'manual' && this.instanceSettings.isWorker) {
			this.addPushHooks(hooks);
		}

		// When running with worker mode, main process executes
		// Only workflowExecuteBefore + workflowExecuteAfter
		// So to avoid confusion, we are removing other hooks.

		const { executionRepository } = this;
		// TODO: >>> clear all nodeExecuteAfter hooks <<<
		// hookFunctions.nodeExecuteAfter = [];
		hooks.addCallback('workflowExecuteAfter', async function (fullRunData) {
			// Don't delete executions before they are finished
			if (!fullRunData.finished) return;

			const executionStatus = determineFinalExecutionStatus(fullRunData);
			fullRunData.status = executionStatus;

			const saveSettings = toSaveSettings(this.workflowData.settings);

			const shouldNotSave =
				(executionStatus === 'success' && !saveSettings.success) ||
				(executionStatus !== 'success' && !saveSettings.error);

			if (shouldNotSave) {
				await executionRepository.hardDelete({
					workflowId: this.workflowData.id,
					executionId: this.executionId,
				});
			}
		});

		return hooks;
	}

	/** Returns ExecutionLifecycleHooks instance for running sub-workflows */
	forSubExecution(
		mode: WorkflowExecuteMode,
		executionId: string,
		workflowData: IWorkflowBase,
		optionalParameters: ExecutionHooksOptionalParameters,
	) {
		const hooks = new ExecutionLifecycleHooks(mode, executionId, workflowData, optionalParameters);
		this.addPreExecuteHooks(hooks);
		this.addEventHooks(hooks);
		this.addSavingHooks(hooks, false);
		if (mode === 'manual' && this.instanceSettings.isWorker) {
			this.addPushHooks(hooks);
		}
		return hooks;
	}

	private addPreExecuteHooks(hooks: ExecutionLifecycleHooks) {
		const { externalHooks } = this;

		hooks.addCallback('workflowExecuteBefore', async function (workflow) {
			await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
		});

		// TODO: skip this if saveSettings.progress is not true
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

	private addEventHooks(hooks: ExecutionLifecycleHooks) {
		const { eventService, workflowStatisticsService } = this;
		hooks.addCallback('nodeExecuteBefore', async function (nodeName) {
			const { executionId, workflowData: workflow } = this;
			eventService.emit('node-pre-execute', { executionId, workflow, nodeName });
		});

		hooks.addCallback('nodeExecuteAfter', async function (nodeName) {
			const { executionId, workflowData: workflow } = this;
			eventService.emit('node-post-execute', { executionId, workflow, nodeName });
		});

		hooks.addCallback('workflowExecuteBefore', async function () {
			const { executionId, workflowData } = this;
			eventService.emit('workflow-pre-execute', { executionId, data: workflowData });
		});

		hooks.addCallback('nodeFetchedData', async (workflowId, node) => {
			workflowStatisticsService.emit('nodeFetchedData', { workflowId, node });
		});
	}

	/** Returns hook functions to save workflow execution and call error workflow */
	private addSavingHooks(hooks: ExecutionLifecycleHooks, isWorker: boolean) {
		const {
			errorReporter,
			executionRepository,
			logger,
			workflowStatisticsService,
			workflowStaticDataService,
		} = this;
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const factory = this;

		// eslint-disable-next-line complexity
		hooks.addCallback('workflowExecuteAfter', async function (fullRunData, newStaticData) {
			logger.debug('Executing hook (hookFunctionsSave)', {
				executionId: this.executionId,
				workflowId: this.workflowData.id,
				isWorker,
			});

			// TODO: why is this skipped in the worker?
			if (!isWorker) {
				await restoreBinaryDataId(fullRunData, this.executionId, this.mode);
			}

			const isManualMode = this.mode === 'manual';

			try {
				if (!isManualMode && isWorkflowIdValid(this.workflowData.id) && newStaticData) {
					// Workflow is saved so update in database
					try {
						await workflowStaticDataService.saveStaticDataById(this.workflowData.id, newStaticData);
					} catch (e) {
						errorReporter.error(e);
						logger.error(
							`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${ensureError(e).message}" (hookFunctionsSave)`,
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
					await executionRepository.softDelete(this.executionId);

					return;
				}

				const shouldNotSave =
					(executionStatus === 'success' && !saveSettings.success) ||
					(executionStatus !== 'success' && !saveSettings.error);

				if (shouldNotSave && !fullRunData.waitTill && !isManualMode) {
					WorkflowExecuteAdditionalData.executeErrorWorkflow(
						this.workflowData,
						fullRunData,
						this.mode,
						this.executionId,
						this.retryOf,
					);

					await executionRepository.hardDelete({
						workflowId: this.workflowData.id,
						executionId: this.executionId,
					});

					return;
				}

				// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
				// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
				const fullExecutionData = factory.prepareExecutionDataForDbUpdate({
					runData: fullRunData,
					workflowData: this.workflowData,
					workflowStatusFinal: executionStatus,
					retryOf: this.retryOf,
				});

				// When going into the waiting state, store the pushRef in the execution-data
				if (fullRunData.waitTill && isManualMode) {
					fullExecutionData.data.pushRef = this.pushRef;
				}

				await factory.updateExistingExecution({
					executionId: this.executionId,
					workflowId: this.workflowData.id,
					executionData: fullExecutionData,
				});

				if (!isManualMode) {
					WorkflowExecuteAdditionalData.executeErrorWorkflow(
						this.workflowData,
						fullRunData,
						this.mode,
						this.executionId,
						this.retryOf,
					);
				}
			} catch (error) {
				errorReporter.error(error);
				logger.error(`Failed saving execution data to DB on execution ID ${this.executionId}`, {
					executionId: this.executionId,
					workflowId: this.workflowData.id,
					error: ensureError(error),
				});
				if (!isManualMode) {
					WorkflowExecuteAdditionalData.executeErrorWorkflow(
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
	}

	/** Returns hook functions to push data to Editor-UI */
	private addPushHooks(hooks: ExecutionLifecycleHooks) {
		const { logger, push } = this;

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

			push.send({ type: 'nodeExecuteBefore', data: { executionId, nodeName } }, pushRef);
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

			push.send({ type: 'nodeExecuteAfter', data: { executionId, nodeName, data } }, pushRef);
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
			push.send(
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
				push.send({ type: 'executionWaiting', data: { executionId } }, pushRef);
			} else {
				const rawData = stringify(fullRunData.data);
				push.send(
					{ type: 'executionFinished', data: { executionId, workflowId, status, rawData } },
					pushRef,
				);
			}
		});
	}

	private prepareExecutionDataForDbUpdate(parameters: {
		runData: IRun;
		workflowData: IWorkflowBase;
		workflowStatusFinal: ExecutionStatus;
		retryOf?: string;
	}) {
		const { runData, workflowData, workflowStatusFinal, retryOf } = parameters;
		// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
		// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
		const pristineWorkflowData: IWorkflowBase = pick(workflowData, [
			'id',
			'name',
			'active',
			'createdAt',
			'updatedAt',
			'nodes',
			'connections',
			'settings',
			'staticData',
			'pinData',
		]);

		const fullExecutionData: UpdateExecutionPayload = {
			data: runData.data,
			mode: runData.mode,
			finished: runData.finished ? runData.finished : false,
			startedAt: runData.startedAt,
			stoppedAt: runData.stoppedAt,
			workflowData: pristineWorkflowData,
			waitTill: runData.waitTill,
			status: workflowStatusFinal,
			workflowId: pristineWorkflowData.id,
		};

		if (retryOf !== undefined) {
			fullExecutionData.retryOf = retryOf.toString();
		}

		const workflowId = workflowData.id;
		if (isWorkflowIdValid(workflowId)) {
			fullExecutionData.workflowId = workflowId;
		}

		return fullExecutionData;
	}

	private async updateExistingExecution(parameters: {
		executionId: string;
		workflowId: string;
		executionData: Partial<IExecutionDb>;
	}) {
		const { executionId, workflowId, executionData } = parameters;
		// Leave log message before flatten as that operation increased memory usage a lot and the chance of a crash is highest here
		this.logger.debug(`Save execution data to database for execution ID ${executionId}`, {
			executionId,
			workflowId,
			finished: executionData.finished,
			stoppedAt: executionData.stoppedAt,
		});

		await this.executionRepository.updateExistingExecution(executionId, executionData);

		try {
			const metadata = executionData.data?.resultData.metadata;
			if (metadata) {
				await this.executionMetadataService.save(executionId, metadata);
			}
		} catch (e) {
			const error = ensureError(e);
			this.errorReporter.error(error);
			this.logger.error(`Failed to save metadata for execution ID ${executionId}`, { error });
		}

		if (executionData.finished === true && executionData.retryOf !== undefined) {
			await this.executionRepository.updateExistingExecution(executionData.retryOf, {
				retrySuccessId: executionId,
			});
		}
	}
}
