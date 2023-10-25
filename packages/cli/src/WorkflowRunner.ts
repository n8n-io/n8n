/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { IProcessMessage } from 'n8n-core';
import { WorkflowExecute } from 'n8n-core';

import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IRun,
	WorkflowExecuteMode,
	WorkflowHooks,
} from 'n8n-workflow';
import {
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	Workflow,
	WorkflowOperationError,
} from 'n8n-workflow';

import PCancelable from 'p-cancelable';
import { join as pathJoin } from 'path';
import { fork } from 'child_process';

import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { ExternalHooks } from '@/ExternalHooks';
import type {
	IExecutionResponse,
	IProcessMessageDataHook,
	IWorkflowExecutionDataProcess,
	IWorkflowExecutionDataProcessWithExecution,
} from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import type { Job, JobData, JobResponse } from '@/Queue';
// eslint-disable-next-line import/no-cycle
import { Queue } from '@/Queue';
import { decodeWebhookResponse } from '@/helpers/decodeWebhookResponse';
// eslint-disable-next-line import/no-cycle
import * as WorkflowHelpers from '@/WorkflowHelpers';
// eslint-disable-next-line import/no-cycle
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { generateFailedExecutionFromError } from '@/WorkflowHelpers';
import { initErrorHandling } from '@/ErrorReporting';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import { Push } from '@/push';
import { eventBus } from './eventbus';
import { recoverExecutionDataFromEventLogMessages } from './eventbus/MessageEventBus/recoverEvents';
import { Container } from 'typedi';
import { InternalHooks } from './InternalHooks';
import { ExecutionRepository } from '@db/repositories';

export class WorkflowRunner {
	activeExecutions: ActiveExecutions;

	push: Push;

	jobQueue: Queue;

	constructor() {
		this.push = Container.get(Push);
		this.activeExecutions = Container.get(ActiveExecutions);
	}

	/**
	 * The process did send a hook message so execute the appropriate hook
	 */
	processHookMessage(workflowHooks: WorkflowHooks, hookData: IProcessMessageDataHook) {
		void workflowHooks.executeHookFunctions(hookData.hook, hookData.parameters);
	}

	/**
	 * The process did error
	 */
	async processError(
		error: ExecutionError,
		startedAt: Date,
		executionMode: WorkflowExecuteMode,
		executionId: string,
		hooks?: WorkflowHooks,
	) {
		ErrorReporter.error(error);

		const isQueueMode = config.getEnv('executions.mode') === 'queue';

		// in queue mode, first do a sanity run for the edge case that the execution was not marked as stalled
		// by Bull even though it executed successfully, see https://github.com/OptimalBits/bull/issues/1415

		if (isQueueMode && executionMode !== 'manual') {
			const executionWithoutData = await Container.get(ExecutionRepository).findSingleExecution(
				executionId,
				{
					includeData: false,
				},
			);
			if (executionWithoutData?.finished === true && executionWithoutData?.status === 'success') {
				// false positive, execution was successful
				return;
			}
		}

		const fullRunData: IRun = {
			data: {
				resultData: {
					error: {
						...error,
						message: error.message,
						stack: error.stack,
					},
					runData: {},
				},
			},
			finished: false,
			mode: executionMode,
			startedAt,
			stoppedAt: new Date(),
			status: 'error',
		};

		// The following will attempt to recover runData from event logs
		// Note that this will only work as long as the event logs actually contain the events from this workflow execution
		// Since processError is run almost immediately after the workflow execution has failed, it is likely that the event logs
		// does contain those messages.
		try {
			// Search for messages for this executionId in event logs
			const eventLogMessages = await eventBus.getEventsByExecutionId(executionId);
			// Attempt to recover more better runData from these messages (but don't update the execution db entry yet)
			if (eventLogMessages.length > 0) {
				const eventLogExecutionData = await recoverExecutionDataFromEventLogMessages(
					executionId,
					eventLogMessages,
					false,
				);
				if (eventLogExecutionData) {
					fullRunData.data.resultData.runData = eventLogExecutionData.resultData.runData;
					fullRunData.status = 'crashed';
				}
			}

			const executionFlattedData = await Container.get(ExecutionRepository).findSingleExecution(
				executionId,
				{
					includeData: true,
				},
			);

			if (executionFlattedData) {
				void Container.get(InternalHooks).onWorkflowCrashed(
					executionId,
					executionMode,
					executionFlattedData?.workflowData,
					// TODO: get metadata to be sent here
					// executionFlattedData?.metadata,
				);
			}
		} catch {
			// Ignore errors
		}

		// Remove from active execution with empty data. That will
		// set the execution to failed.
		this.activeExecutions.remove(executionId, fullRunData);

		if (hooks) {
			await hooks.executeHookFunctions('workflowExecuteAfter', [fullRunData]);
		}
	}

	/**
	 * Run the workflow
	 *
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 */
	async run(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
		executionId?: string,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		const executionsMode = config.getEnv('executions.mode');
		const executionsProcess = config.getEnv('executions.process');

		await initErrorHandling();

		if (executionsMode === 'queue') {
			this.jobQueue = Container.get(Queue);
		}

		if (executionsMode === 'queue' && data.executionMode !== 'manual') {
			// Do not run "manual" executions in bull because sending events to the
			// frontend would not be possible
			executionId = await this.enqueueExecution(
				data,
				loadStaticData,
				realtime,
				executionId,
				responsePromise,
			);
		} else {
			if (executionsProcess === 'main') {
				executionId = await this.runMainProcess(data, loadStaticData, executionId, responsePromise);
			} else {
				executionId = await this.runSubprocess(data, loadStaticData, executionId, responsePromise);
			}
			void Container.get(InternalHooks).onWorkflowBeforeExecute(executionId, data);
		}

		// only run these when not in queue mode or when the execution is manual,
		// since these calls are now done by the worker directly
		if (executionsMode !== 'queue' || data.executionMode === 'manual') {
			const postExecutePromise = this.activeExecutions.getPostExecutePromise(executionId);
			const externalHooks = Container.get(ExternalHooks);
			postExecutePromise
				.then(async (executionData) => {
					void Container.get(InternalHooks).onWorkflowPostExecute(
						executionId!,
						data.workflowData,
						executionData,
						data.userId,
					);
					if (externalHooks.exists('workflow.postExecute')) {
						try {
							await externalHooks.run('workflow.postExecute', [
								executionData,
								data.workflowData,
								executionId,
							]);
						} catch (error) {
							ErrorReporter.error(error);
							console.error('There was a problem running hook "workflow.postExecute"', error);
						}
					}
				})
				.catch((error) => {
					ErrorReporter.error(error);
					console.error('There was a problem running internal hook "onWorkflowPostExecute"', error);
				});
		}

		return executionId;
	}

	/**
	 * Run the workflow in current process
	 *
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 */
	async runMainProcess(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		restartExecutionId?: string,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		const workflowId = data.workflowData.id;
		if (loadStaticData === true && workflowId) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(workflowId);
		}

		const nodeTypes = Container.get(NodeTypes);

		// Soft timeout to stop workflow execution after current running node
		// Changes were made by adding the `workflowTimeout` to the `additionalData`
		// So that the timeout will also work for executions with nested workflows.
		let executionTimeout: NodeJS.Timeout;

		const workflowSettings = data.workflowData.settings ?? {};
		let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
		}

		const workflow = new Workflow({
			id: workflowId,
			name: data.workflowData.name,
			nodes: data.workflowData.nodes,
			connections: data.workflowData.connections,
			active: data.workflowData.active,
			nodeTypes,
			staticData: data.workflowData.staticData,
			settings: workflowSettings,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			data.userId,
			undefined,
			workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
		);
		additionalData.restartExecutionId = restartExecutionId;

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, undefined, restartExecutionId);
		additionalData.executionId = executionId;

		Logger.verbose(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);
		let workflowExecution: PCancelable<IRun>;

		try {
			Logger.verbose(
				`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
				{ executionId },
			);

			additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(
				data,
				executionId,
				true,
			);

			try {
				await PermissionChecker.check(workflow, data.userId);
			} catch (error) {
				ErrorReporter.error(error);
				// Create a failed execution with the data for the node
				// save it and abort execution
				const failedExecution = generateFailedExecutionFromError(
					data.executionMode,
					error,
					error.node,
				);
				await additionalData.hooks.executeHookFunctions('workflowExecuteAfter', [failedExecution]);
				this.activeExecutions.remove(executionId, failedExecution);
				return executionId;
			}

			additionalData.hooks.hookFunctions.sendResponse = [
				async (response: IExecuteResponsePromiseData): Promise<void> => {
					if (responsePromise) {
						responsePromise.resolve(response);
					}
				},
			];

			additionalData.setExecutionStatus = WorkflowExecuteAdditionalData.setExecutionStatus.bind({
				executionId,
			});

			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({
				sessionId: data.sessionId,
			});

			if (data.executionData !== undefined) {
				Logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {
					executionId,
				});
				const workflowExecute = new WorkflowExecute(
					additionalData,
					data.executionMode,
					data.executionData,
				);
				workflowExecution = workflowExecute.processRunExecutionData(workflow);
			} else if (
				data.runData === undefined ||
				data.startNodes === undefined ||
				data.startNodes.length === 0
			) {
				Logger.debug(`Execution ID ${executionId} will run executing all nodes.`, { executionId });
				// Execute all nodes

				const startNode = WorkflowHelpers.getExecutionStartNode(data, workflow);

				// Can execute without webhook so go on
				const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
				workflowExecution = workflowExecute.run(
					workflow,
					startNode,
					data.destinationNode,
					data.pinData,
				);
			} else {
				Logger.debug(`Execution ID ${executionId} is a partial execution.`, { executionId });
				// Execute only the nodes between start and destination nodes
				const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
				workflowExecution = workflowExecute.runPartialWorkflow(
					workflow,
					data.runData,
					data.startNodes,
					data.destinationNode,
					data.pinData,
				);
			}

			this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);

			if (workflowTimeout > 0) {
				const timeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout')) * 1000; // as seconds
				executionTimeout = setTimeout(() => {
					void this.activeExecutions.stopExecution(executionId, 'timeout');
				}, timeout);
			}

			workflowExecution
				.then((fullRunData) => {
					clearTimeout(executionTimeout);
					if (workflowExecution.isCanceled) {
						fullRunData.finished = false;
					}
					fullRunData.status = this.activeExecutions.getStatus(executionId);
					this.activeExecutions.remove(executionId, fullRunData);
				})
				.catch(async (error) =>
					this.processError(
						error,
						new Date(),
						data.executionMode,
						executionId,
						additionalData.hooks,
					),
				);
		} catch (error) {
			await this.processError(
				error,
				new Date(),
				data.executionMode,
				executionId,
				additionalData.hooks,
			);

			throw error;
		}

		return executionId;
	}

	async enqueueExecution(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
		restartExecutionId?: string,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		// TODO: If "loadStaticData" is set to true it has to load data new on worker

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, undefined, restartExecutionId);
		if (responsePromise) {
			this.activeExecutions.attachResponsePromise(executionId, responsePromise);
		}

		const jobData: JobData = {
			executionId,
			loadStaticData: !!loadStaticData,
		};

		let priority = 100;
		if (realtime === true) {
			// Jobs which require a direct response get a higher priority
			priority = 50;
		}
		// TODO: For realtime jobs should probably also not do retry or not retry if they are older than x seconds.
		//       Check if they get retried by default and how often.
		const jobOptions = {
			priority,
			removeOnComplete: true,
			removeOnFail: true,
		};
		let job: Job;
		let hooks: WorkflowHooks;
		try {
			job = await this.jobQueue.add(jobData, jobOptions);

			console.log(`Started with job ID: ${job.id.toString()} (Execution ID: ${executionId})`);

			hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerMain(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);

			// Normally also workflow should be supplied here but as it only used for sending
			// data to editor-UI is not needed.
			await hooks.executeHookFunctions('workflowExecuteBefore', []);
		} catch (error) {
			// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
			// "workflowExecuteAfter" which we require.
			const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
				data.executionMode,
				executionId,
				data.workflowData,
				{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
			);
			await this.processError(error, new Date(), data.executionMode, executionId, hooks);
			throw error;
		}

		const workflowExecution: PCancelable<IRun> = new PCancelable(
			async (resolve, reject, onCancel) => {
				onCancel.shouldReject = false;
				onCancel(async () => {
					const queue = Container.get(Queue);
					await queue.stopJob(job);

					// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooksWorker = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);

					const error = new WorkflowOperationError('Workflow-Execution has been canceled!');
					await this.processError(error, new Date(), data.executionMode, executionId, hooksWorker);

					reject(error);
				});

				const jobData: Promise<JobResponse> = job.finished();

				const queueRecoveryInterval = config.getEnv('queue.bull.queueRecoveryInterval');

				const racingPromises: Array<Promise<JobResponse>> = [jobData];

				let clearWatchdogInterval;
				if (queueRecoveryInterval > 0) {
					/** ***********************************************
					 * Long explanation about what this solves:      *
					 * This only happens in a very specific scenario *
					 * when Redis crashes and recovers shortly       *
					 * but during this time, some execution(s)       *
					 * finished. The end result is that the main     *
					 * process will wait indefinitely and never      *
					 * get a response. This adds an active polling to*
					 * the queue that allows us to identify that the *
					 * execution finished and get information from   *
					 * the database.                                 *
					 ************************************************ */
					let watchDogInterval: NodeJS.Timeout | undefined;

					const watchDog: Promise<JobResponse> = new Promise((res) => {
						watchDogInterval = setInterval(async () => {
							const currentJob = await this.jobQueue.getJob(job.id);
							// When null means job is finished (not found in queue)
							if (currentJob === null) {
								// Mimic worker's success message
								res({ success: true });
							}
						}, queueRecoveryInterval * 1000);
					});

					racingPromises.push(watchDog);

					clearWatchdogInterval = () => {
						if (watchDogInterval) {
							clearInterval(watchDogInterval);
							watchDogInterval = undefined;
						}
					};
				}

				let racingPromisesResult: JobResponse = {
					success: false,
				};
				try {
					racingPromisesResult = await Promise.race(racingPromises);
					if (clearWatchdogInterval !== undefined) {
						clearWatchdogInterval();
					}
				} catch (error) {
					ErrorReporter.error(error);
					// We use "getWorkflowHooksWorkerExecuter" as "getWorkflowHooksWorkerMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
						data.executionMode,
						executionId,
						data.workflowData,
						{ retryOf: data.retryOf ? data.retryOf.toString() : undefined },
					);
					Logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
					if (clearWatchdogInterval !== undefined) {
						clearWatchdogInterval();
					}
					await this.processError(error, new Date(), data.executionMode, executionId, hooks);

					reject(error);
				}

				// optimization: only pull and unflatten execution data from the Db when it is needed
				const executionHasPostExecutionPromises =
					this.activeExecutions.getPostExecutePromiseCount(executionId) > 0;

				if (executionHasPostExecutionPromises) {
					Logger.debug(
						`Reading execution data for execution ${executionId} from db for PostExecutionPromise.`,
					);
				} else {
					Logger.debug(
						`Skipping execution data for execution ${executionId} since there are no PostExecutionPromise.`,
					);
				}

				const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
					executionId,
					{
						includeData: executionHasPostExecutionPromises,
						unflattenData: executionHasPostExecutionPromises,
					},
				);
				if (!fullExecutionData) {
					return reject(new Error(`Could not find execution with id "${executionId}"`));
				}

				const runData: IRun = {
					data: {},
					finished: fullExecutionData.finished,
					mode: fullExecutionData.mode,
					startedAt: fullExecutionData.startedAt,
					stoppedAt: fullExecutionData.stoppedAt,
				} as IRun;

				if (executionHasPostExecutionPromises) {
					runData.data = (fullExecutionData as IExecutionResponse).data;
				}

				// NOTE: due to the optimization of not loading the execution data from the db when no post execution promises are present,
				// the execution data in runData.data MAY not be available here.
				// This means that any function expecting with runData has to check if the runData.data defined from this point
				this.activeExecutions.remove(executionId, runData);

				// Normally also static data should be supplied here but as it only used for sending
				// data to editor-UI is not needed.
				await hooks.executeHookFunctions('workflowExecuteAfter', [runData]);
				try {
					// Check if this execution data has to be removed from database
					// based on workflow settings.
					const workflowSettings = data.workflowData.settings ?? {};
					const saveDataErrorExecution =
						workflowSettings.saveDataErrorExecution ?? config.getEnv('executions.saveDataOnError');
					const saveDataSuccessExecution =
						workflowSettings.saveDataSuccessExecution ??
						config.getEnv('executions.saveDataOnSuccess');

					const workflowDidSucceed = !racingPromisesResult.error;
					if (
						(workflowDidSucceed && saveDataSuccessExecution === 'none') ||
						(!workflowDidSucceed && saveDataErrorExecution === 'none')
					) {
						await Container.get(ExecutionRepository).hardDelete({
							workflowId: data.workflowData.id as string,
							executionId,
						});
					}
					// eslint-disable-next-line id-denylist
				} catch (err) {
					// We don't want errors here to crash n8n. Just log and proceed.
					console.log('Error removing saved execution from database. More details: ', err);
				}

				resolve(runData);
			},
		);

		workflowExecution.catch(() => {
			// We `reject` this promise if the execution fails
			// but the error is handled already by processError
			// So we're just preventing crashes here.
		});

		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
		return executionId;
	}

	/**
	 * Run the workflow
	 *
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 */
	async runSubprocess(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		restartExecutionId?: string,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		const workflowId = data.workflowData.id;
		let startedAt = new Date();
		const subprocess = fork(pathJoin(__dirname, 'WorkflowRunnerProcess.js'));

		if (loadStaticData === true && workflowId) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(workflowId);
		}

		data.restartExecutionId = restartExecutionId;

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, subprocess, restartExecutionId);

		(data as unknown as IWorkflowExecutionDataProcessWithExecution).executionId = executionId;

		const workflowHooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);

		try {
			// Send all data to subprocess it needs to run the workflow
			subprocess.send({ type: 'startWorkflow', data } as IProcessMessage);
		} catch (error) {
			await this.processError(error, new Date(), data.executionMode, executionId, workflowHooks);
			return executionId;
		}

		// Start timeout for the execution
		let executionTimeout: NodeJS.Timeout;

		const workflowSettings = data.workflowData.settings ?? {};
		let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default

		const processTimeoutFunction = (timeout: number) => {
			void this.activeExecutions.stopExecution(executionId, 'timeout');
			executionTimeout = setTimeout(() => subprocess.kill(), Math.max(timeout * 0.2, 5000)); // minimum 5 seconds
		};

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout')) * 1000; // as seconds
			// Start timeout already now but give process at least 5 seconds to start.
			// Without it could would it be possible that the workflow executions times out before it even got started if
			// the timeout time is very short as the process start time can be quite long.
			executionTimeout = setTimeout(
				processTimeoutFunction,
				Math.max(5000, workflowTimeout),
				workflowTimeout,
			);
		}

		// Create a list of child spawned executions
		// If after the child process exits we have
		// outstanding executions, we remove them
		const childExecutionIds: string[] = [];

		// Listen to data from the subprocess
		subprocess.on('message', async (message: IProcessMessage) => {
			Logger.debug(
				`Received child process message of type ${message.type} for execution ID ${executionId}.`,
				{ executionId },
			);
			if (message.type === 'start') {
				// Now that the execution actually started set the timeout again so that does not time out to early.
				startedAt = new Date();
				if (workflowTimeout > 0) {
					clearTimeout(executionTimeout);
					executionTimeout = setTimeout(processTimeoutFunction, workflowTimeout, workflowTimeout);
				}
			} else if (message.type === 'end') {
				clearTimeout(executionTimeout);
				this.activeExecutions.remove(executionId, message.data.runData);
			} else if (message.type === 'sendResponse') {
				if (responsePromise) {
					responsePromise.resolve(decodeWebhookResponse(message.data.response));
				}
			} else if (message.type === 'sendDataToUI') {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				WorkflowExecuteAdditionalData.sendDataToUI.bind({ sessionId: data.sessionId })(
					message.data.type,
					message.data.data,
				);
			} else if (message.type === 'processError') {
				clearTimeout(executionTimeout);
				const executionError = message.data.executionError as ExecutionError;
				await this.processError(
					executionError,
					startedAt,
					data.executionMode,
					executionId,
					workflowHooks,
				);
			} else if (message.type === 'processHook') {
				this.processHookMessage(workflowHooks, message.data as IProcessMessageDataHook);
			} else if (message.type === 'timeout') {
				// Execution timed out and its process has been terminated
				const timeoutError = new WorkflowOperationError('Workflow execution timed out!');

				// No need to add hook here as the subprocess takes care of calling the hooks
				await this.processError(timeoutError, startedAt, data.executionMode, executionId);
			} else if (message.type === 'startExecution') {
				const executionId = await this.activeExecutions.add(message.data.runData);
				childExecutionIds.push(executionId);
				subprocess.send({ type: 'executionId', data: { executionId } } as IProcessMessage);
			} else if (message.type === 'finishExecution') {
				const executionIdIndex = childExecutionIds.indexOf(message.data.executionId);
				if (executionIdIndex !== -1) {
					childExecutionIds.splice(executionIdIndex, 1);
				}

				if (message.data.result === undefined) {
					const noDataError = new WorkflowOperationError('Workflow finished with no result data');
					const subWorkflowHooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(
						data,
						message.data.executionId,
					);
					await this.processError(
						noDataError,
						startedAt,
						data.executionMode,
						message.data?.executionId,
						subWorkflowHooks,
					);
				} else {
					this.activeExecutions.remove(message.data.executionId, message.data.result);
				}
			}
		});

		// Also get informed when the processes does exit especially when it did crash or timed out
		subprocess.on('exit', async (code, signal) => {
			if (signal === 'SIGTERM') {
				Logger.debug(`Subprocess for execution ID ${executionId} timed out.`, { executionId });
				// Execution timed out and its process has been terminated
				const timeoutError = new WorkflowOperationError('Workflow execution timed out!');

				await this.processError(
					timeoutError,
					startedAt,
					data.executionMode,
					executionId,
					workflowHooks,
				);
			} else if (code !== 0) {
				Logger.debug(
					`Subprocess for execution ID ${executionId} finished with error code ${code}.`,
					{ executionId },
				);
				// Process did exit with error code, so something went wrong.
				const executionError = new WorkflowOperationError(
					'Workflow execution process crashed for an unknown reason!',
				);

				await this.processError(
					executionError,
					startedAt,
					data.executionMode,
					executionId,
					workflowHooks,
				);
			}

			for (const executionId of childExecutionIds) {
				// When the child process exits, if we still have
				// pending child executions, we mark them as finished
				// They will display as unknown to the user
				// Instead of pending forever as executing when it
				// actually isn't anymore.

				this.activeExecutions.remove(executionId);
			}

			clearTimeout(executionTimeout);
		});

		return executionId;
	}
}
