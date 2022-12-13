/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable id-denylist */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable func-names */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BinaryDataManager, eventEmitter, UserSettings, WorkflowExecute } from 'n8n-core';

import {
	IDataObject,
	IExecuteData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
	INodeParameters,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowExecuteAdditionalData,
	IWorkflowExecuteHooks,
	IWorkflowHooksOptionalParameters,
	IWorkflowSettings,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	SubworkflowOperationError,
	Workflow,
	WorkflowExecuteMode,
	WorkflowHooks,
} from 'n8n-workflow';

import { LessThanOrEqual } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import config from '@/config';
import * as Db from '@/Db';
import * as ActiveExecutions from '@/ActiveExecutions';
import { CredentialsHelper } from '@/CredentialsHelper';
import { ExternalHooks } from '@/ExternalHooks';
import {
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionResponse,
	IPushDataExecutionFinished,
	IWorkflowBase,
	IWorkflowExecuteProcess,
	IWorkflowExecutionDataProcess,
	IWorkflowErrorData,
} from '@/Interfaces';
import { InternalHooksManager } from '@/InternalHooksManager';
import { NodeTypes } from '@/NodeTypes';
import * as Push from '@/Push';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { getUserById, getWorkflowOwner, whereClause } from '@/UserManagement/UserManagementHelper';
import { findSubworkflowStart } from '@/utils';
import { PermissionChecker } from './UserManagement/PermissionChecker';

const ERROR_TRIGGER_TYPE = config.getEnv('nodes.errorTriggerType');

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
		pastExecutionUrl = `${WebhookHelpers.getWebhookBaseUrl()}execution/${executionId}`;
	}

	if (fullRunData.data.resultData.error !== undefined) {
		let workflowErrorData: IWorkflowErrorData;

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
					id: workflowData.id !== undefined ? workflowData.id.toString() : undefined,
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
					id: workflowData.id !== undefined ? workflowData.id.toString() : undefined,
					name: workflowData.name,
				},
			};
		}

		// Run the error workflow
		// To avoid an infinite loop do not run the error workflow again if the error-workflow itself failed and it is its own error-workflow.
		if (
			// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
			workflowData.settings !== undefined &&
			workflowData.settings.errorWorkflow &&
			!(
				mode === 'error' &&
				workflowData.id &&
				workflowData.settings.errorWorkflow.toString() === workflowData.id.toString()
			)
		) {
			Logger.verbose(`Start external error workflow`, {
				executionId,
				errorWorkflowId: workflowData.settings.errorWorkflow.toString(),
				workflowId: workflowData.id,
			});
			// If a specific error workflow is set run only that one

			// First, do permission checks.
			if (!workflowData.id) {
				// Manual executions do not trigger error workflows
				// So this if should never happen. It was added to
				// make sure there are no possible security gaps
				return;
			}
			getWorkflowOwner(workflowData.id)
				.then((user) => {
					void WorkflowHelpers.executeErrorWorkflow(
						workflowData.settings!.errorWorkflow as string,
						workflowErrorData,
						user,
					);
				})
				.catch((error: Error) => {
					ErrorReporter.error(error);
					Logger.error(
						`Could not execute ErrorWorkflow for execution ID ${this.executionId} because of error querying the workflow owner`,
						{
							executionId,
							errorWorkflowId: workflowData.settings!.errorWorkflow!.toString(),
							workflowId: workflowData.id,
							error,
							workflowErrorData,
						},
					);
				});
		} else if (
			mode !== 'error' &&
			workflowData.id !== undefined &&
			workflowData.nodes.some((node) => node.type === ERROR_TRIGGER_TYPE)
		) {
			Logger.verbose(`Start internal error workflow`, { executionId, workflowId: workflowData.id });
			void getWorkflowOwner(workflowData.id).then((user) => {
				void WorkflowHelpers.executeErrorWorkflow(
					workflowData.id!.toString(),
					workflowErrorData,
					user,
				);
			});
		}
	}
}

/**
 * Prunes Saved Execution which are older than configured.
 * Throttled to be executed just once in configured timeframe.
 *
 */
let throttling = false;
async function pruneExecutionData(this: WorkflowHooks): Promise<void> {
	if (!throttling) {
		Logger.verbose('Pruning execution data from database');

		throttling = true;
		const timeout = config.getEnv('executions.pruneDataTimeout'); // in seconds
		const maxAge = config.getEnv('executions.pruneDataMaxAge'); // in h
		const date = new Date(); // today
		date.setHours(date.getHours() - maxAge);

		// date reformatting needed - see https://github.com/typeorm/typeorm/issues/2286
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const utcDate = DateUtils.mixedDateToUtcDatetimeString(date);

		try {
			const executions = await Db.collections.Execution.find({
				stoppedAt: LessThanOrEqual(utcDate),
			});
			await Db.collections.Execution.delete({ stoppedAt: LessThanOrEqual(utcDate) });
			setTimeout(() => {
				throttling = false;
			}, timeout * 1000);
			// Mark binary data for deletion for all executions
			await BinaryDataManager.getInstance().markDataForDeletionByExecutionIds(
				executions.map(({ id }) => id.toString()),
			);
		} catch (error) {
			ErrorReporter.error(error);
			throttling = false;
			Logger.error(
				`Failed pruning execution data from database for execution ID ${this.executionId} (hookFunctionsSave)`,
				{
					...error,
					executionId: this.executionId,
					sessionId: this.sessionId,
					workflowId: this.workflowData.id,
				},
			);
		}
	}
}

/**
 * Returns hook functions to push data to Editor-UI
 *
 */
function hookFunctionsPush(): IWorkflowExecuteHooks {
	return {
		nodeExecuteBefore: [
			async function (this: WorkflowHooks, nodeName: string): Promise<void> {
				// Push data to session which started workflow before each
				// node which starts rendering
				if (this.sessionId === undefined) {
					return;
				}
				Logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
					executionId: this.executionId,
					sessionId: this.sessionId,
					workflowId: this.workflowData.id,
				});

				const pushInstance = Push.getInstance();
				pushInstance.send(
					'nodeExecuteBefore',
					{
						executionId: this.executionId,
						nodeName,
					},
					this.sessionId,
				);
			},
		],
		nodeExecuteAfter: [
			async function (this: WorkflowHooks, nodeName: string, data: ITaskData): Promise<void> {
				// Push data to session which started workflow after each rendered node
				if (this.sessionId === undefined) {
					return;
				}
				Logger.debug(`Executing hook on node "${nodeName}" (hookFunctionsPush)`, {
					executionId: this.executionId,
					sessionId: this.sessionId,
					workflowId: this.workflowData.id,
				});

				const pushInstance = Push.getInstance();
				pushInstance.send(
					'nodeExecuteAfter',
					{
						executionId: this.executionId,
						nodeName,
						data,
					},
					this.sessionId,
				);
			},
		],
		workflowExecuteBefore: [
			async function (this: WorkflowHooks): Promise<void> {
				Logger.debug(`Executing hook (hookFunctionsPush)`, {
					executionId: this.executionId,
					sessionId: this.sessionId,
					workflowId: this.workflowData.id,
				});
				// Push data to session which started the workflow
				if (this.sessionId === undefined) {
					return;
				}
				const pushInstance = Push.getInstance();
				pushInstance.send(
					'executionStarted',
					{
						executionId: this.executionId,
						mode: this.mode,
						startedAt: new Date(),
						retryOf: this.retryOf,
						workflowId: this.workflowData.id,
						sessionId: this.sessionId,
						workflowName: this.workflowData.name,
					},
					this.sessionId,
				);
			},
		],
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				Logger.debug(`Executing hook (hookFunctionsPush)`, {
					executionId: this.executionId,
					sessionId: this.sessionId,
					workflowId: this.workflowData.id,
				});
				// Push data to session which started the workflow
				if (this.sessionId === undefined) {
					return;
				}

				// Clone the object except the runData. That one is not supposed
				// to be send. Because that data got send piece by piece after
				// each node which finished executing
				const pushRunData = {
					...fullRunData,
					data: {
						...fullRunData.data,
						resultData: {
							...fullRunData.data.resultData,
							runData: {},
						},
					},
				};

				// Push data to editor-ui once workflow finished
				Logger.debug(`Save execution progress to database for execution ID ${this.executionId} `, {
					executionId: this.executionId,
					workflowId: this.workflowData.id,
				});
				// TODO: Look at this again
				const sendData: IPushDataExecutionFinished = {
					executionId: this.executionId,
					data: pushRunData,
					retryOf: this.retryOf,
				};

				const pushInstance = Push.getInstance();
				pushInstance.send('executionFinished', sendData, this.sessionId);
			},
		],
	};
}

export function hookFunctionsPreExecute(parentProcessMode?: string): IWorkflowExecuteHooks {
	const externalHooks = ExternalHooks();

	return {
		workflowExecuteBefore: [
			async function (this: WorkflowHooks, workflow: Workflow): Promise<void> {
				await externalHooks.run('workflow.preExecute', [workflow, this.mode]);
			},
		],
		nodeExecuteAfter: [
			async function (
				nodeName: string,
				data: ITaskData,
				executionData: IRunExecutionData,
			): Promise<void> {
				if (this.workflowData.settings !== undefined) {
					if (this.workflowData.settings.saveExecutionProgress === false) {
						return;
					}
					if (
						this.workflowData.settings.saveExecutionProgress !== true &&
						!config.getEnv('executions.saveExecutionProgress')
					) {
						return;
					}
				} else if (!config.getEnv('executions.saveExecutionProgress')) {
					return;
				}

				try {
					Logger.debug(
						`Save execution progress to database for execution ID ${this.executionId} `,
						{ executionId: this.executionId, nodeName },
					);

					const execution = await Db.collections.Execution.findOne(this.executionId);

					if (execution === undefined) {
						// Something went badly wrong if this happens.
						// This check is here mostly to make typescript happy.
						return;
					}
					const fullExecutionData: IExecutionResponse =
						ResponseHelper.unflattenExecutionData(execution);

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

					const flattenedExecutionData = ResponseHelper.flattenExecutionData(fullExecutionData);

					await Db.collections.Execution.update(
						this.executionId,
						flattenedExecutionData as IExecutionFlattedDb,
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
	return {
		nodeExecuteBefore: [],
		nodeExecuteAfter: [],
		workflowExecuteBefore: [],
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				Logger.debug(`Executing hook (hookFunctionsSave)`, {
					executionId: this.executionId,
					workflowId: this.workflowData.id,
				});

				// Prune old execution data
				if (config.getEnv('executions.pruneData')) {
					await pruneExecutionData.call(this);
				}

				const isManualMode = [this.mode, parentProcessMode].includes('manual');

				try {
					if (
						!isManualMode &&
						WorkflowHelpers.isWorkflowIdValid(this.workflowData.id as string) &&
						newStaticData
					) {
						// Workflow is saved so update in database
						try {
							await WorkflowHelpers.saveStaticDataById(
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

					let saveManualExecutions = config.getEnv('executions.saveDataManualExecutions');
					if (
						this.workflowData.settings !== undefined &&
						this.workflowData.settings.saveManualExecutions !== undefined
					) {
						// Apply to workflow override
						saveManualExecutions = this.workflowData.settings.saveManualExecutions as boolean;
					}

					if (isManualMode && !saveManualExecutions && !fullRunData.waitTill) {
						// Data is always saved, so we remove from database
						await Db.collections.Execution.delete(this.executionId);
						await BinaryDataManager.getInstance().markDataForDeletionByExecutionId(
							this.executionId,
						);

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

					const workflowDidSucceed = !fullRunData.data.resultData.error;
					if (
						(workflowDidSucceed && saveDataSuccessExecution === 'none') ||
						(!workflowDidSucceed && saveDataErrorExecution === 'none')
					) {
						if (!fullRunData.waitTill) {
							if (!isManualMode) {
								executeErrorWorkflow(
									this.workflowData,
									fullRunData,
									this.mode,
									this.executionId,
									this.retryOf,
								);
							}
							// Data is always saved, so we remove from database
							await Db.collections.Execution.delete(this.executionId);
							await BinaryDataManager.getInstance().markDataForDeletionByExecutionId(
								this.executionId,
							);

							return;
						}
					}

					const fullExecutionData: IExecutionDb = {
						data: fullRunData.data,
						mode: fullRunData.mode,
						finished: fullRunData.finished ? fullRunData.finished : false,
						startedAt: fullRunData.startedAt,
						stoppedAt: fullRunData.stoppedAt,
						workflowData: this.workflowData,
						waitTill: fullRunData.waitTill,
					};

					if (this.retryOf !== undefined) {
						fullExecutionData.retryOf = this.retryOf.toString();
					}

					if (
						this.workflowData.id !== undefined &&
						WorkflowHelpers.isWorkflowIdValid(this.workflowData.id.toString())
					) {
						fullExecutionData.workflowId = this.workflowData.id.toString();
					}

					// Leave log message before flatten as that operation increased memory usage a lot and the chance of a crash is highest here
					Logger.debug(`Save execution data to database for execution ID ${this.executionId}`, {
						executionId: this.executionId,
						workflowId: this.workflowData.id,
						finished: fullExecutionData.finished,
						stoppedAt: fullExecutionData.stoppedAt,
					});

					const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

					// Save the Execution in DB
					await Db.collections.Execution.update(
						this.executionId,
						executionData as IExecutionFlattedDb,
					);

					if (fullRunData.finished === true && this.retryOf !== undefined) {
						// If the retry was successful save the reference it on the original execution
						// await Db.collections.Execution.save(executionData as IExecutionFlattedDb);
						await Db.collections.Execution.update(this.retryOf, {
							retrySuccessId: this.executionId,
						});
					}

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
					eventEmitter.emit(
						eventEmitter.types.workflowExecutionCompleted,
						this.workflowData,
						fullRunData,
					);
				}
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				eventEmitter.emit(eventEmitter.types.nodeFetchedData, workflowId, node);
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
	return {
		nodeExecuteBefore: [],
		nodeExecuteAfter: [],
		workflowExecuteBefore: [],
		workflowExecuteAfter: [
			async function (
				this: WorkflowHooks,
				fullRunData: IRun,
				newStaticData: IDataObject,
			): Promise<void> {
				try {
					if (WorkflowHelpers.isWorkflowIdValid(this.workflowData.id as string) && newStaticData) {
						// Workflow is saved so update in database
						try {
							await WorkflowHelpers.saveStaticDataById(
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

					const workflowDidSucceed = !fullRunData.data.resultData.error;
					if (!workflowDidSucceed) {
						executeErrorWorkflow(
							this.workflowData,
							fullRunData,
							this.mode,
							this.executionId,
							this.retryOf,
						);
					}

					const fullExecutionData: IExecutionDb = {
						data: fullRunData.data,
						mode: fullRunData.mode,
						finished: fullRunData.finished ? fullRunData.finished : false,
						startedAt: fullRunData.startedAt,
						stoppedAt: fullRunData.stoppedAt,
						workflowData: this.workflowData,
						waitTill: fullRunData.data.waitTill,
					};

					if (this.retryOf !== undefined) {
						fullExecutionData.retryOf = this.retryOf.toString();
					}

					if (
						this.workflowData.id !== undefined &&
						WorkflowHelpers.isWorkflowIdValid(this.workflowData.id.toString())
					) {
						fullExecutionData.workflowId = this.workflowData.id.toString();
					}

					const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

					// Save the Execution in DB
					await Db.collections.Execution.update(
						this.executionId,
						executionData as IExecutionFlattedDb,
					);

					if (fullRunData.finished === true && this.retryOf !== undefined) {
						// If the retry was successful save the reference it on the original execution
						await Db.collections.Execution.update(this.retryOf, {
							retrySuccessId: this.executionId,
						});
					}
				} catch (error) {
					executeErrorWorkflow(
						this.workflowData,
						fullRunData,
						this.mode,
						this.executionId,
						this.retryOf,
					);
				} finally {
					eventEmitter.emit(
						eventEmitter.types.workflowExecutionCompleted,
						this.workflowData,
						fullRunData,
					);
				}
			},
		],
		nodeFetchedData: [
			async (workflowId: string, node: INode) => {
				eventEmitter.emit(eventEmitter.types.nodeFetchedData, workflowId, node);
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

	const policy =
		workflowData.settings?.callerPolicy ?? config.getEnv('workflows.callerPolicyDefaultOption');

	if (policy === 'none') {
		throw new SubworkflowOperationError(
			`Target workflow ID ${workflowData.id} may not be called by other workflows.`,
			'Please update the settings of the target workflow or ask its owner to do so.',
		);
	}

	if (
		policy === 'workflowsFromAList' &&
		typeof workflowData.settings?.callerIds === 'string' &&
		parentWorkflowId !== undefined
	) {
		const allowedCallerIds = workflowData.settings.callerIds
			.split(',')
			.map((id) => id.trim())
			.filter((id) => id !== '');

		if (!allowedCallerIds.includes(parentWorkflowId)) {
			throw new SubworkflowOperationError(
				`Target workflow ID ${workflowData.id} may only be called by a list of workflows, which does not include current workflow ID ${parentWorkflowId}.`,
				'Please update the settings of the target workflow or ask its owner to do so.',
			);
		}
	}

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
	userId: string,
	parentWorkflowId?: string,
	parentWorkflowSettings?: IWorkflowSettings,
): Promise<IWorkflowBase> {
	if (workflowInfo.id === undefined && workflowInfo.code === undefined) {
		throw new Error(
			`No information about the workflow to execute found. Please provide either the "id" or "code"!`,
		);
	}

	let workflowData: IWorkflowBase | undefined;
	if (workflowInfo.id !== undefined) {
		if (!Db.isInitialized) {
			// The first time executeWorkflow gets called the Database has
			// to get initialized first
			await Db.init();
		}
		const user = await getUserById(userId);
		let relations = ['workflow', 'workflow.tags'];

		if (config.getEnv('workflowTagsDisabled')) {
			relations = relations.filter((relation) => relation !== 'workflow.tags');
		}

		const shared = await Db.collections.SharedWorkflow.findOne({
			relations,
			where: whereClause({
				user,
				entityType: 'workflow',
				entityId: workflowInfo.id,
			}),
		});

		workflowData = shared?.workflow;

		if (workflowData === undefined) {
			throw new Error(`The workflow with the id "${workflowInfo.id}" does not exist.`);
		}
	} else {
		workflowData = workflowInfo.code;
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
	options?: {
		parentWorkflowId?: string;
		inputData?: INodeExecutionData[];
		parentExecutionId?: string;
		loadedWorkflowData?: IWorkflowBase;
		loadedRunData?: IWorkflowExecutionDataProcess;
		parentWorkflowSettings?: IWorkflowSettings;
	},
): Promise<Array<INodeExecutionData[] | null> | IWorkflowExecuteProcess> {
	const externalHooks = ExternalHooks();
	await externalHooks.init();

	const nodeTypes = NodeTypes();

	const workflowData =
		options?.loadedWorkflowData ??
		(await getWorkflowData(
			workflowInfo,
			additionalData.userId,
			options?.parentWorkflowId,
			options?.parentWorkflowSettings,
		));

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
		options?.loadedRunData ??
		(await getRunData(workflowData, additionalData.userId, options?.inputData));

	let executionId;

	if (options?.parentExecutionId !== undefined) {
		executionId = options?.parentExecutionId;
	} else {
		executionId =
			options?.parentExecutionId !== undefined
				? options?.parentExecutionId
				: await ActiveExecutions.getInstance().add(runData);
	}

	let data;
	try {
		await PermissionChecker.check(workflow, additionalData.userId);

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
		if (
			workflowData.settings?.executionTimeout !== undefined &&
			workflowData.settings.executionTimeout > 0
		) {
			// We might have received a max timeout timestamp from the parent workflow
			// If we did, then we get the minimum time between the two timeouts
			// If no timeout was given from the parent, then we use our timeout.
			subworkflowTimeout = Math.min(
				additionalData.executionTimeoutTimestamp || Number.MAX_SAFE_INTEGER,
				Date.now() + (workflowData.settings.executionTimeout as number) * 1000,
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
		if (options?.parentExecutionId !== undefined) {
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
		};
		// When failing, we might not have finished the execution
		// Therefore, database might not contain finished errors.
		// Force an update to db as there should be no harm doing this

		const fullExecutionData: IExecutionDb = {
			data: fullRunData.data,
			mode: fullRunData.mode,
			finished: fullRunData.finished ? fullRunData.finished : false,
			startedAt: fullRunData.startedAt,
			stoppedAt: fullRunData.stoppedAt,
			workflowData,
		};
		if (workflowData.id) {
			fullExecutionData.workflowId = workflowData.id as string;
		}

		const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

		await Db.collections.Execution.update(executionId, executionData as IExecutionFlattedDb);
		throw {
			...error,
			stack: error.stack,
		};
	}

	await externalHooks.run('workflow.postExecute', [data, workflowData, executionId]);
	void InternalHooksManager.getInstance().onWorkflowPostExecute(
		executionId,
		workflowData,
		data,
		additionalData.userId,
	);

	if (data.finished === true) {
		// Workflow did finish successfully

		await ActiveExecutions.getInstance().remove(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return returnData!.data!.main;
	}
	await ActiveExecutions.getInstance().remove(executionId, data);
	// Workflow did fail
	const { error } = data.data.resultData;
	// eslint-disable-next-line @typescript-eslint/no-throw-literal
	throw {
		...error,
		stack: error!.stack,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sendMessageToUI(source: string, messages: any[]) {
	if (this.sessionId === undefined) {
		return;
	}

	// Push data to session which started workflow
	try {
		const pushInstance = Push.getInstance();
		pushInstance.send(
			'sendConsoleMessage',
			{
				source: `[Node: "${source}"]`,
				messages,
			},
			this.sessionId,
		);
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

	const encryptionKey = await UserSettings.getEncryptionKey();

	return {
		credentialsHelper: new CredentialsHelper(encryptionKey),
		encryptionKey,
		executeWorkflow,
		restApiUrl: urlBaseWebhook + config.getEnv('endpoints.rest'),
		timezone,
		webhookBaseUrl,
		webhookWaitingBaseUrl,
		webhookTestBaseUrl,
		currentNodeParameters,
		executionTimeoutTimestamp,
		userId,
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
	const hookFunctions = hookFunctionsPush();
	const preExecuteFunctions = hookFunctionsPreExecute(optionalParameters.parentProcessMode);
	for (const key of Object.keys(preExecuteFunctions)) {
		if (hookFunctions[key] === undefined) {
			hookFunctions[key] = [];
		}
		hookFunctions[key]!.push.apply(hookFunctions[key], preExecuteFunctions[key]);
	}

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

	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, {
		sessionId: data.sessionId,
		retryOf: data.retryOf as string,
	});
}
