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
	Workflow,
	WorkflowHooks,
} from 'n8n-workflow';

import pick from 'lodash.pick';
import type { FindOptionsWhere } from 'typeorm';
import { LessThanOrEqual, In } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import config from '@/config';
import * as Db from '@/Db';
import { ActiveExecutions } from '@/ActiveExecutions';
import { CredentialsHelper } from '@/CredentialsHelper';
import { ExternalHooks } from '@/ExternalHooks';
import type {
	IExecutionDb,
	IExecutionFlattedDb,
	IExecutionResponse,
	IPushDataExecutionFinished,
	IWorkflowExecuteProcess,
	IWorkflowExecutionDataProcess,
	IWorkflowErrorData,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { Push } from '@/push';
import * as ResponseHelper from '@/ResponseHelper';
import * as WebhookHelpers from '@/WebhookHelpers';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import { getWorkflowOwner } from '@/UserManagement/UserManagementHelper';
import { findSubworkflowStart } from '@/utils';
import { PermissionChecker } from './UserManagement/PermissionChecker';
import { WorkflowsService } from './workflows/workflows.services';
import { Container } from 'typedi';
import { InternalHooks } from '@/InternalHooks';

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
		if (
			workflowData.settings?.errorWorkflow &&
			!(
				mode === 'error' &&
				workflowId &&
				workflowData.settings.errorWorkflow.toString() === workflowId
			)
		) {
			Logger.verbose('Start external error workflow', {
				executionId,
				errorWorkflowId: workflowData.settings.errorWorkflow.toString(),
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
			getWorkflowOwner(workflowId)
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
			void getWorkflowOwner(workflowId).then((user) => {
				void WorkflowHelpers.executeErrorWorkflow(workflowId, workflowErrorData, user);
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
		const maxCount = config.getEnv('executions.pruneDataMaxCount');
		const date = new Date(); // today
		date.setHours(date.getHours() - maxAge);

		// date reformatting needed - see https://github.com/typeorm/typeorm/issues/2286
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const utcDate = DateUtils.mixedDateToUtcDatetimeString(date);

		const toPrune: Array<FindOptionsWhere<IExecutionFlattedDb>> = [
			{ stoppedAt: LessThanOrEqual(utcDate) },
		];

		if (maxCount > 0) {
			const executions = await Db.collections.Execution.find({
				select: ['id'],
				skip: maxCount,
				take: 1,
				order: { id: 'DESC' },
			});

			if (executions[0]) {
				toPrune.push({ id: LessThanOrEqual(executions[0].id) });
			}
		}

		const isBinaryModeDefaultMode = config.getEnv('binaryDataManager.mode') === 'default';
		try {
			setTimeout(() => {
				throttling = false;
			}, timeout * 1000);
			let executionIds: Array<IExecutionFlattedDb['id']>;
			do {
				executionIds = (
					await Db.collections.Execution.find({
						select: ['id'],
						where: toPrune,
						take: 100,
					})
				).map(({ id }) => id);
				await Db.collections.Execution.delete({ id: In(executionIds) });
				// Mark binary data for deletion for all executions
				if (!isBinaryModeDefaultMode)
					await BinaryDataManager.getInstance().markDataForDeletionByExecutionIds(executionIds);
			} while (executionIds.length > 0);
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

				const pushInstance = Container.get(Push);
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

				const pushInstance = Container.get(Push);
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
				const pushInstance = Container.get(Push);
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

				const pushInstance = Container.get(Push);
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

					const execution = await Db.collections.Execution.findOneBy({ id: this.executionId });

					if (execution === null) {
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

					fullExecutionData.status = 'running';

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
				Logger.debug('Executing hook (hookFunctionsSave)', {
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
						WorkflowHelpers.isWorkflowIdValid(this.workflowData.id) &&
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

					const workflowHasCrashed = fullRunData.status === 'crashed';
					const workflowDidSucceed = !fullRunData.data.resultData.error && !workflowHasCrashed;
					let workflowStatusFinal: ExecutionStatus = workflowDidSucceed ? 'success' : 'failed';
					if (workflowHasCrashed) workflowStatusFinal = 'crashed';

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

					// Although it is treated as IWorkflowBase here, it's being instantiated elsewhere with properties that may be sensitive
					// As a result, we should create an IWorkflowBase object with only the data we want to save in it.
					const pristineWorkflowData: IWorkflowBase = pick(this.workflowData, [
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

					const fullExecutionData: IExecutionDb = {
						data: fullRunData.data,
						mode: fullRunData.mode,
						finished: fullRunData.finished ? fullRunData.finished : false,
						startedAt: fullRunData.startedAt,
						stoppedAt: fullRunData.stoppedAt,
						workflowData: pristineWorkflowData,
						waitTill: fullRunData.waitTill,
						status: workflowStatusFinal,
					};

					if (this.retryOf !== undefined) {
						fullExecutionData.retryOf = this.retryOf.toString();
					}

					const workflowId = this.workflowData.id;
					if (WorkflowHelpers.isWorkflowIdValid(workflowId)) {
						fullExecutionData.workflowId = workflowId;
					}

					// Leave log message before flatten as that operation increased memory usage a lot and the chance of a crash is highest here
					Logger.debug(`Save execution data to database for execution ID ${this.executionId}`, {
						executionId: this.executionId,
						workflowId,
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
					if (WorkflowHelpers.isWorkflowIdValid(this.workflowData.id) && newStaticData) {
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

					const workflowHasCrashed = fullRunData.status === 'crashed';
					const workflowDidSucceed = !fullRunData.data.resultData.error && !workflowHasCrashed;
					let workflowStatusFinal: ExecutionStatus = workflowDidSucceed ? 'success' : 'failed';
					if (workflowHasCrashed) workflowStatusFinal = 'crashed';

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
						status: workflowStatusFinal,
					};

					if (this.retryOf !== undefined) {
						fullExecutionData.retryOf = this.retryOf.toString();
					}

					const workflowId = this.workflowData.id;
					if (WorkflowHelpers.isWorkflowIdValid(workflowId)) {
						fullExecutionData.workflowId = workflowId;
					}

					const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

					// Save the Execution in DB
					await Db.collections.Execution.update(
						this.executionId,
						executionData as IExecutionFlattedDb,
					);

					// For reasons(tm) the execution status is not updated correctly in the first update, so has to be written again (tbd)
					await Db.collections.Execution.update(this.executionId, {
						status: executionData.status,
					});

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
		if (!Db.isInitialized) {
			// The first time executeWorkflow gets called the Database has
			// to get initialized first
			await Db.init();
		}

		const relations = config.getEnv('workflowTagsDisabled') ? [] : ['tags'];

		workflowData = await WorkflowsService.get({ id: workflowInfo.id }, { relations });

		if (workflowData === undefined) {
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
	const externalHooks = Container.get(ExternalHooks);
	await externalHooks.init();

	const nodeTypes = Container.get(NodeTypes);

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
				: await Container.get(ActiveExecutions).add(runData);
	}

	void Container.get(InternalHooks).onWorkflowBeforeExecute(executionId || '', runData);

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
			status: 'error',
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
			status: fullRunData.status,
			workflowData,
		};
		if (workflowData.id) {
			fullExecutionData.workflowId = workflowData.id;
		}

		const executionData = ResponseHelper.flattenExecutionData(fullExecutionData);

		await Db.collections.Execution.update(executionId, executionData as IExecutionFlattedDb);
		throw {
			...error,
			stack: error.stack,
			message: error.message,
		};
	}

	await externalHooks.run('workflow.postExecute', [data, workflowData, executionId]);

	void Container.get(InternalHooks).onWorkflowPostExecute(
		executionId,
		workflowData,
		data,
		additionalData.userId,
	);

	if (data.finished === true) {
		// Workflow did finish successfully

		Container.get(ActiveExecutions).remove(executionId, data);
		const returnData = WorkflowHelpers.getDataLastExecutedNodeData(data);
		return returnData!.data!.main;
	}
	Container.get(ActiveExecutions).remove(executionId, data);
	// Workflow did fail
	const { error } = data.data.resultData;
	// eslint-disable-next-line @typescript-eslint/no-throw-literal
	throw {
		...error,
		stack: error!.stack,
	};
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sendMessageToUI(source: string, messages: any[]) {
	const { sessionId } = this;
	if (sessionId === undefined) {
		return;
	}

	// Push data to session which started workflow
	try {
		const pushInstance = Container.get(Push);
		pushInstance.send(
			'sendConsoleMessage',
			{
				source: `[Node: "${source}"]`,
				messages,
			},
			sessionId,
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
		setExecutionStatus,
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

	hookFunctions.nodeExecuteBefore.push(async function (
		this: WorkflowHooks,
		nodeName: string,
	): Promise<void> {
		void Container.get(InternalHooks).onNodeBeforeExecute(
			this.executionId,
			this.workflowData,
			nodeName,
		);
	});
	hookFunctions.nodeExecuteAfter.push(async function (
		this: WorkflowHooks,
		nodeName: string,
	): Promise<void> {
		void Container.get(InternalHooks).onNodePostExecute(
			this.executionId,
			this.workflowData,
			nodeName,
		);
	});
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
	hookFunctions.nodeExecuteBefore?.push(async function (
		this: WorkflowHooks,
		nodeName: string,
	): Promise<void> {
		void Container.get(InternalHooks).onNodeBeforeExecute(
			this.executionId,
			this.workflowData,
			nodeName,
		);
	});
	if (!hookFunctions.nodeExecuteAfter) hookFunctions.nodeExecuteAfter = [];
	hookFunctions.nodeExecuteAfter.push(async function (
		this: WorkflowHooks,
		nodeName: string,
	): Promise<void> {
		void Container.get(InternalHooks).onNodePostExecute(
			this.executionId,
			this.workflowData,
			nodeName,
		);
	});

	return new WorkflowHooks(hookFunctions, data.executionMode, executionId, data.workflowData, {
		sessionId: data.sessionId,
		retryOf: data.retryOf as string,
	});
}
