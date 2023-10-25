/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { WorkflowExecute } from 'n8n-core';

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
} from 'n8n-workflow';
import {
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	NodeOperationError,
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';

import { Container } from 'typedi';
import config from '@/config';
import { ActiveExecutions } from '@/ActiveExecutions';
import { CredentialsHelper } from '@/CredentialsHelper';
import { ExternalHooks } from '@/ExternalHooks';
import type {
	IPushDataExecutionFinished,
	IWorkflowExecuteProcess,
	IWorkflowExecutionDataProcess,
	IWorkflowErrorData,
	IPushDataType,
	ExecutionPayload,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { Push } from '@/push';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { findSubworkflowStart, isWorkflowIdValid } from '@/utils';
import { PermissionChecker } from './UserManagement/PermissionChecker';
import { WorkflowsService } from './workflows/workflows.services';
import { InternalHooks } from '@/InternalHooks';
import { ExecutionRepository } from '@db/repositories';
import { EventsService } from '@/services/events.service';
import { SecretsHelper } from './SecretsHelpers';
import { OwnershipService } from './services/ownership.service';
import {
	determineFinalExecutionStatus,
	prepareExecutionDataForDbUpdate,
	updateExistingExecution,
} from './executionLifecycleHooks/shared/sharedHookFunctions';
import { restoreBinaryDataId } from './executionLifecycleHooks/restoreBinaryDataId';

const ERROR_TRIGGER_TYPE = config.getEnv('nodes.errorTriggerType');

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
	// Check if there was an error and if so if an errorWorkflow or a trigger is set

	let pastExecutionUrl: string | undefined;
	if (executionId !== undefined) {
		pastExecutionUrl = `${WebhookHelpers.getWebhookBaseUrl()}workflow/${
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

		// Run the error workflow
		// To avoid an infinite loop do not run the error workflow again if the error-workflow itself failed and it is its own error-workflow.
		const { errorWorkflow } = workflowData.settings ?? {};
		if (errorWorkflow && !(mode === 'error' && workflowId && errorWorkflow === workflowId)) {
			Logger.verbose('Start external error workflow', {
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
				.getWorkflowOwnerCached(workflowId)
				.then((user) => {
					void WorkflowHelpers.executeErrorWorkflow(errorWorkflow, workflowErrorData, user);
				})
				.catch((error: Error) => {
					ErrorReporter.error(error);
					Logger.error(
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
			workflowData.nodes.some((node) => node.type === ERROR_TRIGGER_TYPE)
		) {
			Logger.verbose('Start internal error workflow', { executionId, workflowId });
			void Container.get(OwnershipService)
				.getWorkflowOwnerCached(workflowId)
				.then((user) => {
					void WorkflowHelpers.executeErrorWorkflow(workflowId, workflowErrorData, user);
				});
		}
	}
}

/**
 * Returns hook functions to push data to Editor-UI
 *
 */
function hookFunctionsPush(): IWorkflowExecuteHooks {
	const pushInstance = Container.get(Push);
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				const { sessionId, executionId } = this;
				// Push data to session which started workflow before each
				// node which starts rendering
				if (sessionId === undefined) {
					return;
				}

				Logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
					executionId,
					sessionId,
					workflowId: this.workflowData.id,
				});

				pushInstance.send('nodeExecuteBefore', { executionId, nodeName }, sessionId);
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string, data: ITaskData): Promise<void> {
				const { sessionId, executionId } = this;
				// Push data to session which started workflow after each rendered node
				if (sessionId === undefined) {
					return;
				}

				Logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
					executionId,
					sessionId,
					workflowId: this.workflowData.id,
				});

				pushInstance.send('nodeExecuteAfter', { executionId, nodeName, data }, sessionId);
			},
		],
		workflowExecuteBefore: [
			async function (this: WorkflowHooks): Promise<void> {
				const { sessionId, executionId } = this;
				const { id: workflowId, name: workflowName } = this.workflowData;
				Logger.debug('Executing hook (hookFunctionsPush)', {
					executionId,
					sessionId,
					workflowId,
				});
				// Push data to session which started the workflow
				if (sessionId === undefined) {
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
						sessionId,
						workflowName,
					},
					sessionId,
				);
			},
		],
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				const { sessionId, executionId, retryOf } = this;
				const { id: workflowId } = this.workflowData;
				Logger.debug('Executing hook (hookFunctionsPush)', {
					executionId,
					sessionId,
					workflowId,
				});
				// Push data to session which started the workflow
				if (sessionId === undefined) {
					return;
				}

				// Clone the object except the runData. That one is not supposed
				// to be send. Because that data got send piece by piece after
				// each node which finished executing
				// Edit: we now DO send the runData to the UI if mode=manual so that it shows the point of crashes
				let pushRunData;
				if (fullRunData.mode === 'manual') {
					pushRunData = fullRunData;
				} else {
					pushRunData = {
						...fullRunData,
						data: {
							...fullRunData.data,
							resultData: {
								...fullRunData.data.resultData,
								runData: {},
							},
						},
					};
				}

				// Push data to editor-ui once workflow finished
				Logger.debug(`Save execution progress to database for execution ID ${executionId} `, {
					executionId,
					workflowId,
				});
				// TODO: Look at this again
				const sendData: IPushDataExecutionFinished = {
					executionId,
					data: pushRunData,
					retryOf,
				};

				pushInstance.send('executionFinished', sendData, sessionId);
			},
		],
	};
}

export function hookFunctionsPreExecute(parentProcessMode?: string): IWorkflowExecuteHooks {
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
				const saveExecutionProgress = config.getEnv('executions.saveExecutionProgress');
				const workflowSettings = this.workflowData.settings;
				if (workflowSettings !== undefined) {
					if (workflowSettings.saveExecutionProgress === false) {
						return;
					}
					if (workflowSettings.saveExecutionProgress !== true && !saveExecutionProgress) {
						return;
					}
				} else if (!saveExecutionProgress) {
					return;
				}

				try {
					Logger.debug(
						`Save execution progress to database for execution ID ${this.executionId} `,
						{ executionId: this.executionId, nodeName },
					);

					const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
						this.executionId,
						{
							includeData: true,
							unflattenData: true,
						},
					);

					if (!fullExecutionData) {
						// Something went badly wrong if this happens.
						// This check is here mostly to make typescript happy.
						return;
					}

					if (fullExecutionData.finished) {
						// We already received ´workflowExecuteAfter´ webhook, so this is just an async call
						// that was left behind. We skip saving because the other call should have saved everything
						// so this one is safe to ignore
						return;
					}

					if (fullExecutionData.data === undefined) {
						fullExecutionData.data = {
							startData: {},
							resultData: {
								runData: {},
							},
							executionData: {
								contextData: {},
								metadata: {},
								nodeExecutionStack: [],
								waitingExecution: {},
								waitingExecutionSource: {},
							},
						};
					}

					if (Array.isArray(fullExecutionData.data.resultData.runData[nodeName])) {
						// Append data if array exists
						fullExecutionData.data.resultData.runData[nodeName].push(data);
					} else {
						// Initialize array and save data
						fullExecutionData.data.resultData.runData[nodeName] = [data];
					}

					fullExecutionData.data.executionData = executionData.executionData;

					// Set last executed node so that it may resume on failure
					fullExecutionData.data.resultData.lastNodeExecuted = nodeName;

					fullExecutionData.status = 'running';

					await Container.get(ExecutionRepository).updateExistingExecution(
						this.executionId,
						fullExecutionData,
					);
				} catch (err) {
					ErrorReporter.error(err);
					// TODO: Improve in the future!
					// Errors here might happen because of database access
					// For busy machines, we may get "Database is locked" errors.

					// We do this to prevent crashes and executions ending in `unknown` state.
					Logger.error(
						`Failed saving execution progress to database for execution ID ${this.executionId} (hookFunctionsPreExecute, nodeExecuteAfter)`,
						{
							...err,
							executionId: this.executionId,
							sessionId: this.sessionId,
							workflowId: this.workflowData.id,
						},
					);
				}
			},
		],
	};
}

/**
 * Returns hook functions to save workflow execution and call error workflow
 *
 */
function hookFunctionsSave(parentProcessMode?: string): IWorkflowExecuteHooks {
	const internalHooks = Container.get(InternalHooks);
	const eventsService = Container.get(EventsService);
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				void internalHooks.onNodeBeforeExecute(this.executionId, this.workflowData, nodeName);
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				void internalHooks.onNodePostExecute(this.executionId, this.workflowData, nodeName);
			},
		],
		workflowExecuteBefore: [],
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				Logger.debug('Executing hook (hookFunctionsSave)', {
					executionId: this.executionId,
					workflowId: this.workflowData.id,
				});

				if (this.mode === 'webhook' && config.getEnv('binaryDataManager.mode') !== 'default') {
					await restoreBinaryDataId(fullRunData, this.executionId);
				}

				const isManualMode = [this.mode, parentProcessMode].includes('manual');

				try {
					if (!isManualMode && isWorkflowIdValid(this.workflowData.id) && newStaticData) {
						// Workflow is saved so update in database
						try {
							await WorkflowsService.saveStaticDataById(
								this.workflowData.id as string,
								newStaticData,
							);
						} catch (e) {
							ErrorReporter.error(e);
							Logger.error(
								`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (hookFunctionsSave)`,
								{ executionId: this.executionId, workflowId: this.workflowData.id },
							);
						}
					}

					const workflowSettings = this.workflowData.settings;
					let saveManualExecutions = config.getEnv('executions.saveDataManualExecutions');
					if (workflowSettings?.saveManualExecutions !== undefined) {
						// Apply to workflow override
						saveManualExecutions = workflowSettings.saveManualExecutions as boolean;
					}

					if (isManualMode && !saveManualExecutions && !fullRunData.waitTill) {
						await Container.get(ExecutionRepository).hardDelete({
							workflowId: this.workflowData.id as string,
							executionId: this.executionId,
						});

						return;
					}

					// Check config to know if execution should be saved or not
					let saveDataErrorExecution = config.getEnv('executions.saveDataOnError') as string;
					let saveDataSuccessExecution = config.getEnv('executions.saveDataOnSuccess') as string;
					if (this.workflowData.settings !== undefined) {
						saveDataErrorExecution =
							(this.workflowData.settings.saveDataErrorExecution as string) ||
							saveDataErrorExecution;
						saveDataSuccessExecution =
							(this.workflowData.settings.saveDataSuccessExecution as string) ||
							saveDataSuccessExecution;
					}

					const workflowStatusFinal = determineFinalExecutionStatus(fullRunData);

					if (
						(workflowStatusFinal === 'success' && saveDataSuccessExecution === 'none') ||
						(workflowStatusFinal !== 'success' && saveDataErrorExecution === 'none')
					) {
						if (!fullRunData.waitTill && !isManualMode) {
							executeErrorWorkflow(
								this.workflowData,
								fullRunData,
								this.mode,
								this.executionId,
								this.retryOf,
							);
							await Container.get(ExecutionRepository).hardDelete({
								workflowId: this.workflowData.id as string,
								executionId: this.executionId,
							});

							return;
						}
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
						workflowId: this.workflowData.id as string,
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
					Logger.error(`Failed saving execution data to DB on execution ID ${this.executionId}`, {
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
					eventsService.emit('workflowExecutionCompleted', this.workflowData, fullRunData);
				}
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				eventsService.emit('nodeFetchedData', workflowId, node);
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
	const internalHooks = Container.get(InternalHooks);
	const eventsService = Container.get(EventsService);
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				void internalHooks.onNodeBeforeExecute(this.executionId, this.workflowData, nodeName);
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				void internalHooks.onNodePostExecute(this.executionId, this.workflowData, nodeName);
			},
		],
		workflowExecuteBefore: [
			async function (workflow: Workflow, data: IRunExecutionData): Promise<void> {
				void internalHooks.onWorkflowBeforeExecute(this.executionId, this.workflowData);
			},
		],
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				Logger.debug('Executing hook (hookFunctionsSaveWorker)', {
					executionId: this.executionId,
					workflowId: this.workflowData.id,
				});
				try {
					if (isWorkflowIdValid(this.workflowData.id) && newStaticData) {
						// Workflow is saved so update in database
						try {
							await WorkflowsService.saveStaticDataById(
								this.workflowData.id as string,
								newStaticData,
							);
						} catch (e) {
							ErrorReporter.error(e);
							Logger.error(
								`There was a problem saving the workflow with id "${this.workflowData.id}" to save changed staticData: "${e.message}" (workflowExecuteAfter)`,
								{ sessionId: this.sessionId, workflowId: this.workflowData.id },
							);
						}
					}

					const workflowStatusFinal = determineFinalExecutionStatus(fullRunData);

					if (workflowStatusFinal !== 'success') {
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
						workflowId: this.workflowData.id as string,
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
					eventsService.emit('workflowExecutionCompleted', this.workflowData, fullRunData);
				}
			},
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				// send tracking and event log events, but don't wait for them
				void internalHooks.onWorkflowPostExecute(this.executionId, this.workflowData, fullRunData);
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				eventsService.emit('nodeFetchedData', workflowId, node);
			},
		],
	};
}

export async function getRunData(
	workflowData: IWorkflowBase,
	userId: string,
	inputData?: INodeExecutionData[],
	parentWorkflowId?: string,
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

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: mode,
		executionData: runExecutionData,
		// @ts-ignore
		workflowData,
		userId,
	};

	return runData;
}

export async function getWorkflowData(
	workflowInfo: IExecuteWorkflowInfo,
	parentWorkflowId?: string,
	parentWorkflowSettings?: IWorkflowSettings,
): Promise<IWorkflowBase> {
	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new Error(
			'No information about the workflow to execute found. Please provide either the "id" or "code"!',
		);
	}

	let workflowData: IWorkflowBase | null;
	if (workflowInfo.id !== undefined) {
		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		workflowData = await WorkflowsService.get({ id: workflowInfo.id }, { relations });

		if (workflowData === undefined || workflowData === null) {
			throw new Error(`The workflow with the id "${workflowInfo.id}" does not exist.`);
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
async function executeWorkflow(
	workflowInfo: IExecuteWorkflowInfo,
	additionalData: IWorkflowExecuteAdditionalData,
	options: {
		parentWorkflowId?: string;
		inputData?: INodeExecutionData[];
		parentExecutionId?: string;
		loadedWorkflowData?: IWorkflowBase;
		loadedRunData?: IWorkflowExecutionDataProcess;
		parentWorkflowSettings?: IWorkflowSettings;
	},
): Promise<Array<INodeExecutionData[] | null> | IWorkflowExecuteProcess> {
	const internalHooks = Container.get(InternalHooks);
	const externalHooks = Container.get(ExternalHooks);
	await externalHooks.init();

	const nodeTypes = Container.get(NodeTypes);
	const activeExecutions = Container.get(ActiveExecutions);

	const workflowData =
		options.loadedWorkflowData ??
		(await getWorkflowData(workflowInfo, options.parentWorkflowId, options.parentWorkflowSettings));

	const workflowName = workflowData ? workflowData.name : undefined;
	const workflow = new Workflow({
		id: workflowData.id?.toString(),
		name: workflowName,
		nodes: workflowData.nodes,
		connections: workflowData.connections,
		active: workflowData.active,
		nodeTypes,
		staticData: workflowData.staticData,
		settings: workflowData.settings,
	});

	const runData =
		options.loadedRunData ??
		(await getRunData(workflowData, additionalData.userId, options.inputData));

	let executionId;

	if (options.parentExecutionId !== undefined) {
		executionId = options.parentExecutionId;
	} else {
		executionId =
			options.parentExecutionId !== undefined
				? options.parentExecutionId
				: await activeExecutions.add(runData);
	}

	void internalHooks.onWorkflowBeforeExecute(executionId || '', runData);

	let data;
	try {
		await PermissionChecker.check(workflow, additionalData.userId);
		await PermissionChecker.checkSubworkflowExecutePolicy(
			workflow,
			additionalData.userId,
			options.parentWorkflowId,
		);

		// Create new additionalData to have different workflow loaded and to call
		// different webhooks
		const additionalDataIntegrated = await getBase(additionalData.userId);
		additionalDataIntegrated.hooks = getWorkflowHooksIntegrated(
			runData.executionMode,
			executionId,
			workflowData,
			{ parentProcessMode: additionalData.hooks!.mode },
		);
		additionalDataIntegrated.executionId = executionId;

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
		if (options.parentExecutionId !== undefined) {
			// Must be changed to become typed
			return {
				startedAt: new Date(),
				workflow,
				workflowExecute,
			};
		}
		data = await workflowExecute.processRunExecutionData(workflow);
	} catch (error) {
		const fullRunData: IRun = {
			data: {
				resultData: {
					error,
					runData: {},
				},
			},
			finished: false,
			mode: 'integrated',
			startedAt: new Date(),
			stoppedAt: new Date(),
			status: 'failed',
		};
		// When failing, we might not have finished the execution
		// Therefore, database might not contain finished errors.
		// Force an update to db as there should be no harm doing this

		const fullExecutionData: ExecutionPayload = {
			data: fullRunData.data,
			mode: fullRunData.mode,
			finished: fullRunData.finished ? fullRunData.finished : false,
			startedAt: fullRunData.startedAt,
			stoppedAt: fullRunData.stoppedAt,
			status: fullRunData.status,
			workflowData,
		};
		if (workflowData.id) {
			fullExecutionData.workflowId = workflowData.id;
		}

		// remove execution from active executions
		activeExecutions.remove(executionId, fullRunData);

		await Container.get(ExecutionRepository).updateExistingExecution(
			executionId,
			fullExecutionData,
		);
		throw objectToError(
			{
				...error,
				stack: error.stack,
				message: error.message,
			},
			workflow,
		);
	}

	await externalHooks.run('workflow.postExecute', [data, workflowData, executionId]);

	void internalHooks.onWorkflowPostExecute(executionId, workflowData, data, additionalData.userId);

	if (data.finished === true) {
		// Workflow did finish successfully

		activeExecutions.remove(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return returnData!.data!.main;
	}
	activeExecutions.remove(executionId, data);
	// Workflow did fail
	const { error } = data.data.resultData;
	// eslint-disable-next-line @typescript-eslint/no-throw-literal
	throw objectToError(
		{
			...error,
			stack: error!.stack,
		},
		workflow,
	);
}

export function setExecutionStatus(status: ExecutionStatus) {
	if (this.executionId === undefined) {
		Logger.debug(`Setting execution status "${status}" failed because executionId is undefined`);
		return;
	}
	Logger.debug(`Setting execution status for ${this.executionId} to "${status}"`);
	Container.get(ActiveExecutions)
		.setStatus(this.executionId, status)
		.catch((error) => {
			Logger.debug(`Setting execution status "${status}" failed: ${error.message}`);
		});
}

export function sendDataToUI(type: string, data: IDataObject | IDataObject[]) {
	const { sessionId } = this;
	if (sessionId === undefined) {
		return;
	}

	// Push data to session which started workflow
	try {
		const pushInstance = Container.get(Push);
		pushInstance.send(type as IPushDataType, data, sessionId);
	} catch (error) {
		Logger.warn(`There was a problem sending message to UI: ${error.message}`);
	}
}

/**
 * Returns the base additional data without webhooks
 *
 */
export async function getBase(
	userId: string,
	currentNodeParameters?: INodeParameters,
	executionTimeoutTimestamp?: number,
): Promise<IWorkflowExecuteAdditionalData> {
	const urlBaseWebhook = WebhookHelpers.getWebhookBaseUrl();

	const timezone = config.getEnv('generic.timezone');
	const webhookBaseUrl = urlBaseWebhook + config.getEnv('endpoints.webhook');
	const webhookWaitingBaseUrl = urlBaseWebhook + config.getEnv('endpoints.webhookWaiting');
	const webhookTestBaseUrl = urlBaseWebhook + config.getEnv('endpoints.webhookTest');

	const variables = await WorkflowHelpers.getVariables();

	return {
		credentialsHelper: Container.get(CredentialsHelper),
		executeWorkflow,
		restApiUrl: urlBaseWebhook + config.getEnv('endpoints.rest'),
		timezone,
		instanceBaseUrl: urlBaseWebhook,
		webhookBaseUrl,
		webhookWaitingBaseUrl,
		webhookTestBaseUrl,
		currentNodeParameters,
		executionTimeoutTimestamp,
		userId,
		setExecutionStatus,
		variables,
		secretsHelpers: Container.get(SecretsHelper),
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
	optionalParameters?: IWorkflowHooksOptionalParameters,
): WorkflowHooks {
	optionalParameters = optionalParameters || {};
	const hookFunctions = hookFunctionsSave(optionalParameters.parentProcessMode);
	const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
	for (const key of Object.keys(preExecuteFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}
	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
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
	const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
	for (const key of Object.keys(preExecuteFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
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
	const hookFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);

	// TODO: why are workers pushing to frontend?
	// TODO: simplifying this for now to just leave the bare minimum hooks

	// const hookFunctions = hookFunctionsPush();
	// const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
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

	return new WorkflowHooks(hookFunctions, mode, executionId, workflowData, optionalParameters);
}

/**
 * Returns WorkflowHooks instance for running the main workflow
 *
 */
export function getWorkflowHooksMain(
	data: IWorkflowExecutionDataProcess,
	executionId: string,
	isMainProcess = false,
): WorkflowHooks {
	const hookFunctions = hookFunctionsSave();
	const pushFunctions = hookFunctionsPush();
	for (const key of Object.keys(pushFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], pushFunctions[key]);
	}

	if (isMainProcess) {
		const preExecuteFunctions = hookFunctionsPreExecute();
		for (const key of Object.keys(preExecuteFunctions)) {
			if (hookFunctions[key] === undefined) {
				hookFunctions[key] = [];
			}
			hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
		}
	}

	if (!hookFunctions.nodeExecuteBefore) hookFunctions.nodeExecuteBefore = [];
	if (!hookFunctions.nodeExecuteAfter) hookFunctions.nodeExecuteAfter = [];

	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, {
		sessionId: data.sessionId,
		retryOf: data.retryOf as string,
	});
}
