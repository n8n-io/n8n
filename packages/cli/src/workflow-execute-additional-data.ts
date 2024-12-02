/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-use-before-define */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { PushType } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { stringify } from 'flatted';
import { WorkflowExecute } from 'n8n-core';
import {
	ApplicationError,
	ErrorReporterProxy as ErrorReporter,
	NodeOperationError,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecuteHooks,
	IWorkflowHooksOptionalParameters,
	IWorkflowSettings,
	WorkflowExecuteMode,
	ExecutionStatus,
	ExecutionError,
	IExecuteFunctions,
	ITaskDataConnections,
	ExecuteWorkflowOptions,
	IWorkflowExecutionDataProcess,
	EnvProviderState,
	ExecuteWorkflowData,
	RelatedExecution,
} from 'n8n-workflow';
import { Container } from 'typedi';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { CredentialsHelper } from '@/credentials-helper';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { AiEventMap, AiEventPayload } from '@/events/maps/ai.event-map';
import { ExternalHooks } from '@/external-hooks';
import type { IWorkflowErrorData, UpdateExecutionPayload } from '@/interfaces';
import { NodeTypes } from '@/node-types';
import { Push } from '@/push';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { findSubworkflowStart, isWorkflowIdValid } from '@/utils';
import * as WorkflowHelpers from '@/workflow-helpers';

import { WorkflowRepository } from './databases/repositories/workflow.repository';
import { EventService } from './events/event.service';
import { restoreBinaryDataId } from './execution-lifecycle-hooks/restore-binary-data-id';
import { saveExecutionProgress } from './execution-lifecycle-hooks/save-execution-progress';
import {
	determineFinalExecutionStatus,
	prepareExecutionDataForDbUpdate,
	updateExistingExecution,
} from './execution-lifecycle-hooks/shared/shared-hook-functions';
import { toSaveSettings } from './execution-lifecycle-hooks/to-save-settings';
import { Logger } from './logging/logger.service';
import { TaskManager } from './runners/task-managers/task-manager';
import { SecretsHelper } from './secrets-helpers';
import { OwnershipService } from './services/ownership.service';
import { UrlService } from './services/url.service';
import { SubworkflowPolicyChecker } from './subworkflows/subworkflow-policy-checker.service';
import { PermissionChecker } from './user-management/permission-checker';
import { WorkflowExecutionService } from './workflows/workflow-execution.service';
import { WorkflowStaticDataService } from './workflows/workflow-static-data.service';

export function objectToError(errorObject: unknown, workflow: Workflow): Error {
	// TODO: Expand with other error types
	if (errorObject instanceof Error) {
		// If it's already an Error instance, return it as is.
		return errorObject;
	} else if (errorObject && typeof errorObject === 'object' && 'message' in errorObject) {
		// If it's an object with a 'message' property, create a new Error instance.
		let error: Error | undefined;
		if ('node' in errorObject) {
			const node = workflow.getNode((errorObject.node as { name: string }).name);
			if (node) {
				error = new NodeOperationError(
					node,
					errorObject as unknown as Error,
					errorObject as object,
				);
			}
		}

		if (error === undefined) {
			error = new Error(errorObject.message as string);
		}

		if ('description' in errorObject) {
			// @ts-expect-error Error descriptions are surfaced by the UI but
			// not all backend errors account for this property yet.
			error.description = errorObject.description as string;
		}

		if ('stack' in errorObject) {
			// If there's a 'stack' property, set it on the new Error instance.
			error.stack = errorObject.stack as string;
		}

		return error;
	} else {
		// If it's neither an Error nor an object with a 'message' property, create a generic Error.
		return new Error('An error occurred');
	}
}

/**
 * Checks if there was an error and if errorWorkflow or a trigger is defined. If so it collects
 * all the data and executes it
 *
 * @param {IWorkflowBase} workflowData The workflow which got executed
 * @param {IRun} fullRunData The run which produced the error
 * @param {WorkflowExecuteMode} mode The mode in which the workflow got started in
 * @param {string} [executionId] The id the execution got saved as
 */
export function executeErrorWorkflow(
	workflowData: IWorkflowBase,
	fullRunData: IRun,
	mode: WorkflowExecuteMode,
	executionId?: string,
	retryOf?: string,
): void {
	const logger = Container.get(Logger);

	// Check if there was an error and if so if an errorWorkflow or a trigger is set
	let pastExecutionUrl: string | undefined;
	if (executionId !== undefined) {
		pastExecutionUrl = `${Container.get(UrlService).getWebhookBaseUrl()}workflow/${
			workflowData.id
		}/executions/${executionId}`;
	}

	if (fullRunData.data.resultData.error !== undefined) {
		let workflowErrorData: IWorkflowErrorData;
		const workflowId = workflowData.id;

		if (executionId) {
			// The error did happen in an execution
			workflowErrorData = {
				execution: {
					id: executionId,
					url: pastExecutionUrl,
					error: fullRunData.data.resultData.error,
					lastNodeExecuted: fullRunData.data.resultData.lastNodeExecuted!,
					mode,
					retryOf,
				},
				workflow: {
					id: workflowId,
					name: workflowData.name,
				},
			};
		} else {
			// The error did happen in a trigger
			workflowErrorData = {
				trigger: {
					error: fullRunData.data.resultData.error,
					mode,
				},
				workflow: {
					id: workflowId,
					name: workflowData.name,
				},
			};
		}

		const { errorTriggerType } = Container.get(GlobalConfig).nodes;
		// Run the error workflow
		// To avoid an infinite loop do not run the error workflow again if the error-workflow itself failed and it is its own error-workflow.
		const { errorWorkflow } = workflowData.settings ?? {};
		if (errorWorkflow && !(mode === 'error' && workflowId && errorWorkflow === workflowId)) {
			logger.debug('Start external error workflow', {
				executionId,
				errorWorkflowId: errorWorkflow,
				workflowId,
			});
			// If a specific error workflow is set run only that one

			// First, do permission checks.
			if (!workflowId) {
				// Manual executions do not trigger error workflows
				// So this if should never happen. It was added to
				// make sure there are no possible security gaps
				return;
			}

			Container.get(OwnershipService)
				.getWorkflowProjectCached(workflowId)
				.then((project) => {
					void Container.get(WorkflowExecutionService).executeErrorWorkflow(
						errorWorkflow,
						workflowErrorData,
						project,
					);
				})
				.catch((error: Error) => {
					ErrorReporter.error(error);
					logger.error(
						`Could not execute ErrorWorkflow for execution ID ${this.executionId} because of error querying the workflow owner`,
						{
							executionId,
							errorWorkflowId: errorWorkflow,
							workflowId,
							error,
							workflowErrorData,
						},
					);
				});
		} else if (
			mode !== 'error' &&
			workflowId !== undefined &&
			workflowData.nodes.some((node) => node.type === errorTriggerType)
		) {
			logger.debug('Start internal error workflow', { executionId, workflowId });
			void Container.get(OwnershipService)
				.getWorkflowProjectCached(workflowId)
				.then((project) => {
					void Container.get(WorkflowExecutionService).executeErrorWorkflow(
						workflowId,
						workflowErrorData,
						project,
					);
				});
		}
	}
}

/**
 * Returns hook functions to push data to Editor-UI
 *
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

				pushInstance.send('nodeExecuteBefore', { executionId, nodeName }, pushRef);
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

				pushInstance.send('nodeExecuteAfter', { executionId, nodeName, data }, pushRef);
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
					'executionStarted',
					{
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
					pushInstance.send('executionWaiting', { executionId }, pushRef);
				} else {
					const rawData = stringify(fullRunData.data);
					pushInstance.send(
						'executionFinished',
						{ executionId, workflowId, status, rawData },
						pushRef,
					);
				}
			},
		],
	};
}

export function hookFunctionsPreExecute(): IWorkflowExecuteHooks {
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

/**
 * Returns hook functions to save workflow execution and call error workflow
 *
 */
function hookFunctionsSave(): IWorkflowExecuteHooks {
	const logger = Container.get(Logger);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
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
		workflowExecuteBefore: [],
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
							ErrorReporter.error(e);
							logger.error(
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
					ErrorReporter.error(error);
					logger.error(`Failed saving execution data to DB on execution ID ${this.executionId}`, {
						executionId: this.executionId,
						workflowId: this.workflowData.id,
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
 *
 */
function hookFunctionsSaveWorker(): IWorkflowExecuteHooks {
	const logger = Container.get(Logger);
	const workflowStatisticsService = Container.get(WorkflowStatisticsService);
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
		workflowExecuteBefore: [
			async function (): Promise<void> {
				const { executionId, workflowData } = this;

				eventService.emit('workflow-pre-execute', { executionId, data: workflowData });
			},
		],
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
				try {
					if (isWorkflowIdValid(this.workflowData.id) && newStaticData) {
						// Workflow is saved so update in database
						try {
							await Container.get(WorkflowStaticDataService).saveStaticDataById(
								this.workflowData.id,
								newStaticData,
							);
						} catch (e) {
							ErrorReporter.error(e);
							logger.error(
								`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`,
								{ pushRef: this.pushRef, workflowId: this.workflowData.id },
							);
						}
					}

					const workflowStatusFinal = determineFinalExecutionStatus(fullRunData);
					fullRunData.status = workflowStatusFinal;

					if (workflowStatusFinal !== 'success' && workflowStatusFinal !== 'waiting') {
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

					await updateExistingExecution({
						executionId: this.executionId,
						workflowId: this.workflowData.id,
						executionData: fullExecutionData,
					});
				} catch (error) {
					executeErrorWorkflow(
						this.workflowData,
						fullRunData,
						this.mode,
						this.executionId,
						this.retryOf,
					);
				} finally {
					workflowStatisticsService.emit('workflowExecutionCompleted', {
						workflowData: this.workflowData,
						fullRunData,
					});
				}
			},
			async function (this: WorkflowHooks, runData: IRun): Promise<void> {
				const { executionId, workflowData: workflow } = this;

				eventService.emit('workflow-post-execute', {
					workflow,
					executionId,
					runData,
				});
			},
			async function (this: WorkflowHooks, fullRunData: IRun) {
				const externalHooks = Container.get(ExternalHooks);
				if (externalHooks.exists('workflow.postExecute')) {
					try {
						await externalHooks.run('workflow.postExecute', [
							fullRunData,
							this.workflowData,
							this.executionId,
						]);
					} catch (error) {
						ErrorReporter.error(error);
						Container.get(Logger).error(
							'There was a problem running hook "workflow.postExecute"',
							error,
						);
					}
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

export async function getRunData(
	workflowData: IWorkflowBase,
	inputData?: INodeExecutionData[],
	parentExecution?: RelatedExecution,
): Promise<IWorkflowExecutionDataProcess> {
	const mode = 'integrated';

	const startingNode = findSubworkflowStart(workflowData.nodes);

	// Always start with empty data if no inputData got supplied
	inputData = inputData || [
		{
			json: {},
		},
	];

	// Initialize the incoming data
	const nodeExecutionStack: IExecuteData[] = [];
	nodeExecutionStack.push({
		node: startingNode,
		data: {
			main: [inputData],
		},
		metadata: { parentExecution },
		source: null,
	});

	const runExecutionData: IRunExecutionData = {
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
	};

	return {
		executionMode: mode,
		executionData: runExecutionData,
		workflowData,
	};
}

export async function getWorkflowData(
	workflowInfo: IExecuteWorkflowInfo,
	parentWorkflowId: string,
	parentWorkflowSettings?: IWorkflowSettings,
): Promise<IWorkflowBase> {
	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new ApplicationError(
			'No information about the workflow to execute found. Please provide either the "id" or "code"!',
		);
	}

	let workflowData: IWorkflowBase | null;
	if (workflowInfo.id !== undefined) {
		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		workflowData = await Container.get(WorkflowRepository).get(
			{ id: workflowInfo.id },
			{ relations },
		);

		if (workflowData === undefined || workflowData === null) {
			throw new ApplicationError('Workflow does not exist.', {
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

	return workflowData!;
}

/**
 * Executes the workflow with the given ID
 */
export async function executeWorkflow(
	workflowInfo: IExecuteWorkflowInfo,
	additionalData: IWorkflowExecuteAdditionalData,
	options: ExecuteWorkflowOptions,
): Promise<ExecuteWorkflowData> {
	const activeExecutions = Container.get(ActiveExecutions);

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

async function startExecution(
	additionalData: IWorkflowExecuteAdditionalData,
	options: ExecuteWorkflowOptions,
	executionId: string,
	runData: IWorkflowExecutionDataProcess,
	workflowData: IWorkflowBase,
): Promise<ExecuteWorkflowData> {
	const externalHooks = Container.get(ExternalHooks);
	await externalHooks.init();

	const nodeTypes = Container.get(NodeTypes);
	const activeExecutions = Container.get(ActiveExecutions);
	const eventService = Container.get(EventService);
	const executionRepository = Container.get(ExecutionRepository);

	const workflowName = workflowData ? workflowData.name : undefined;
	const workflow = new Workflow({
		id: workflowData.id,
		name: workflowName,
		nodes: workflowData.nodes,
		connections: workflowData.connections,
		active: workflowData.active,
		nodeTypes,
		staticData: workflowData.staticData,
		settings: workflowData.settings,
	});

	/**
	 * A subworkflow execution in queue mode is not enqueued, but rather runs in the
	 * same worker process as the parent execution. Hence ensure the subworkflow
	 * execution is marked as started as well.
	 */
	await executionRepository.setRunning(executionId);

	Container.get(EventService).emit('workflow-pre-execute', { executionId, data: runData });

	let data;
	try {
		await Container.get(PermissionChecker).check(workflowData.id, workflowData.nodes);
		await Container.get(SubworkflowPolicyChecker).check(
			workflow,
			options.parentWorkflowId,
			options.node,
			additionalData.userId,
		);

		// Create new additionalData to have different workflow loaded and to call
		// different webhooks
		const additionalDataIntegrated = await getBase();
		additionalDataIntegrated.hooks = getWorkflowHooksIntegrated(
			runData.executionMode,
			executionId,
			workflowData,
		);
		additionalDataIntegrated.executionId = executionId;
		additionalDataIntegrated.parentCallbackManager = options.parentCallbackManager;

		// Make sure we pass on the original executeWorkflow function we received
		// This one already contains changes to talk to parent process
		// and get executionID from `activeExecutions` running on main process
		additionalDataIntegrated.executeWorkflow = additionalData.executeWorkflow;

		let subworkflowTimeout = additionalData.executionTimeoutTimestamp;
		const workflowSettings = workflowData.settings;
		if (workflowSettings?.executionTimeout !== undefined && workflowSettings.executionTimeout > 0) {
			// We might have received a max timeout timestamp from the parent workflow
			// If we did, then we get the minimum time between the two timeouts
			// If no timeout was given from the parent, then we use our timeout.
			subworkflowTimeout = Math.min(
				additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER,
				Date.now() + workflowSettings.executionTimeout * 1000,
			);
		}

		additionalDataIntegrated.executionTimeoutTimestamp = subworkflowTimeout;

		const runExecutionData = runData.executionData as IRunExecutionData;

		// Execute the workflow
		const workflowExecute = new WorkflowExecute(
			additionalDataIntegrated,
			runData.executionMode,
			runExecutionData,
		);
		const execution = workflowExecute.processRunExecutionData(workflow);
		activeExecutions.attachWorkflowExecution(executionId, execution);
		data = await execution;
	} catch (error) {
		const executionError = error ? (error as ExecutionError) : undefined;
		const fullRunData: IRun = {
			data: {
				resultData: {
					error: executionError,
					runData: {},
				},
			},
			finished: false,
			mode: 'integrated',
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'error',
		};
		// When failing, we might not have finished the execution
		// Therefore, database might not contain finished errors.
		// Force an update to db as there should be no harm doing this

		const fullExecutionData: UpdateExecutionPayload = {
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
		throw objectToError(
			{
				...executionError,
				stack: executionError?.stack,
				message: executionError?.message,
			},
			workflow,
		);
	}

	await externalHooks.run('workflow.postExecute', [data, workflowData, executionId]);

	eventService.emit('workflow-post-execute', {
		workflow: workflowData,
		executionId,
		userId: additionalData.userId,
		runData: data,
	});

	// subworkflow either finished, or is in status waiting due to a wait node, both cases are considered successes here
	if (data.finished === true || data.status === 'waiting') {
		// Workflow did finish successfully

		activeExecutions.finalizeExecution(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return {
			executionId,
			data: returnData!.data!.main,
		};
	}
	activeExecutions.finalizeExecution(executionId, data);

	// Workflow did fail
	const { error } = data.data.resultData;

	throw objectToError(
		{
			...error,
			stack: error?.stack,
		},
		workflow,
	);
}

export function setExecutionStatus(status: ExecutionStatus) {
	const logger = Container.get(Logger);
	if (this.executionId === undefined) {
		logger.debug(`Setting execution status "${status}" failed because executionId is undefined`);
		return;
	}
	logger.debug(`Setting execution status for ${this.executionId} to "${status}"`);
	Container.get(ActiveExecutions).setStatus(this.executionId, status);
}

export function sendDataToUI(type: PushType, data: IDataObject | IDataObject[]) {
	const { pushRef } = this;
	if (pushRef === undefined) {
		return;
	}

	// Push data to session which started workflow
	try {
		const pushInstance = Container.get(Push);
		pushInstance.send(type, data, pushRef);
	} catch (error) {
		const logger = Container.get(Logger);
		logger.warn(`There was a problem sending message to UI: ${error.message}`);
	}
}

/**
 * Returns the base additional data without webhooks
 */
export async function getBase(
	userId?: string,
	currentNodeParameters?: INodeParameters,
	executionTimeoutTimestamp?: number,
): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = Container.get(UrlService).getWebhookBaseUrl();

	const globalConfig = Container.get(GlobalConfig);

	const variables = await WorkflowHelpers.getVariables();

	const eventService = Container.get(EventService);

	return {
		credentialsHelper: Container.get(CredentialsHelper),
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
		secretsHelpers: Container.get(SecretsHelper),
		async startAgentJob(
			additionalData: IWorkflowExecuteAdditionalData,
			jobType: string,
			settings: unknown,
			executeFunctions: IExecuteFunctions,
			inputData: ITaskDataConnections,
			node: INode,
			workflow: Workflow,
			runExecutionData: IRunExecutionData,
			runIndex: number,
			itemIndex: number,
			activeNodeName: string,
			connectionInputData: INodeExecutionData[],
			siblingParameters: INodeParameters,
			mode: WorkflowExecuteMode,
			envProviderState: EnvProviderState,
			executeData?: IExecuteData,
			defaultReturnRunIndex?: number,
			selfData?: IDataObject,
			contextNodeName?: string,
		) {
			return await Container.get(TaskManager).startTask(
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
				defaultReturnRunIndex,
				selfData,
				contextNodeName,
			);
		},
		logAiEvent: (eventName: keyof AiEventMap, payload: AiEventPayload) =>
			eventService.emit(eventName, payload),
	};
}

/**
 * Returns WorkflowHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
function getWorkflowHooksIntegrated(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
): WorkflowHooks {
	const hookFunctions = hookFunctionsSave();
	const preExecuteFunctions = hookFunctionsPreExecute();
	for (const key of Object.keys(preExecuteFunctions)) {
		const hooks = hookFunctions[key] ?? [];
		hooks.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}
	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData);
}

/**
 * Returns WorkflowHooks instance for running integrated workflows
 * (Workflows which get started inside of another workflow)
 */
export function getWorkflowHooksWorkerExecuter(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	optionalParameters?: IWorkflowHooksOptionalParameters,
): WorkflowHooks {
	optionalParameters = optionalParameters || {};
	const hookFunctions = hookFunctionsSaveWorker();
	const preExecuteFunctions = hookFunctionsPreExecute();
	for (const key of Object.keys(preExecuteFunctions)) {
		const hooks = hookFunctions[key] ?? [];
		hooks.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}

	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}

/**
 * Returns WorkflowHooks instance for main process if workflow runs via worker
 */
export function getWorkflowHooksWorkerMain(
	mode: WorkflowExecuteMode,
	executionId: string,
	workflowData: IWorkflowBase,
	optionalParameters?: IWorkflowHooksOptionalParameters,
): WorkflowHooks {
	optionalParameters = optionalParameters || {};
	const hookFunctions = hookFunctionsPreExecute();

	// TODO: why are workers pushing to frontend?
	// TODO: simplifying this for now to just leave the bare minimum hooks

	// const hookFunctions = hookFunctionsPush();
	// const preExecuteFunctions = hookFunctionsPreExecute();
	// for (const key of Object.keys(preExecuteFunctions)) {
	// 	if (hookFunctions[key] === undefined) {
	// 		hookFunctions[key] = [];
	// 	}
	// 	hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	// }

	// When running with worker mode, main process executes
	// Only workflowExecuteBefore + workflowExecuteAfter
	// So to avoid confusion, we are removing other hooks.
	hookFunctions.nodeExecuteBefore = [];
	hookFunctions.nodeExecuteAfter = [];
	hookFunctions.workflowExecuteAfter = [
		async function (this: WorkflowHooks, fullRunData: IRun): Promise<void> {
			// Don't delete executions before they are finished
			if (!fullRunData.finished) return;

			const executionStatus = determineFinalExecutionStatus(fullRunData);
			fullRunData.status = executionStatus;

			const saveSettings = toSaveSettings(this.workflowData.settings);

			const shouldNotSave =
				(executionStatus === 'success' && !saveSettings.success) ||
				(executionStatus !== 'success' && !saveSettings.error);

			if (shouldNotSave) {
				await Container.get(ExecutionRepository).hardDelete({
					workflowId: this.workflowData.id,
					executionId: this.executionId,
				});
			}
		},
	];

	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}

/**
 * Returns WorkflowHooks instance for running the main workflow
 *
 */
export function getWorkflowHooksMain(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
): WorkflowHooks {
	const hookFunctions = hookFunctionsSave();
	const pushFunctions = hookFunctionsPush();
	for (const key of Object.keys(pushFunctions)) {
		const hooks = hookFunctions[key] ?? [];
		hooks.push.apply(hookFunctions[key], pushFunctions[key]);
	}

	const preExecuteFunctions = hookFunctionsPreExecute();
	for (const key of Object.keys(preExecuteFunctions)) {
		const hooks = hookFunctions[key] ?? [];
		hooks.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}

	if (!hookFunctions.nodeExecuteBefore) hookFunctions.nodeExecuteBefore = [];
	if (!hookFunctions.nodeExecuteAfter) hookFunctions.nodeExecuteAfter = [];

	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, {
		pushRef: data.pushRef,
		retryOf: data.retryOf as string,
	});
}
