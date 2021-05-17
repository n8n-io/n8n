import {
	ActiveExecutions,
	CredentialsOverwrites,
	CredentialTypes,
	Db,
	ExternalHooks,
	IBullJobData,
	IBullJobResponse,
	ICredentialsOverwrite,
	ICredentialsTypeData,
	IExecutionFlattedDb,
	IExecutionResponse,
	IProcessMessageDataHook,
	ITransferNodeTypes,
	IWorkflowExecutionDataProcess,
	IWorkflowExecutionDataProcessWithExecution,
	NodeTypes,
	Push,
	ResponseHelper,
	WorkflowExecuteAdditionalData,
	WorkflowHelpers,
} from './';

import {
	IProcessMessage,
	WorkflowExecute,
} from 'n8n-core';

import {
	ExecutionError,
	IRun,
	LoggerProxy as Logger,
	Workflow,
	WorkflowExecuteMode,
	WorkflowHooks,
	WorkflowOperationError,
} from 'n8n-workflow';

import * as config from '../config';
import * as PCancelable from 'p-cancelable';
import { join as pathJoin } from 'path';
import { fork } from 'child_process';

import * as Bull from 'bull';
import * as Queue from './Queue';

export class WorkflowRunner {
	activeExecutions: ActiveExecutions.ActiveExecutions;
	credentialsOverwrites: ICredentialsOverwrite;
	push: Push.Push;
	jobQueue: Bull.Queue;


	constructor() {
		this.push = Push.getInstance();
		this.activeExecutions = ActiveExecutions.getInstance();
		this.credentialsOverwrites = CredentialsOverwrites().getAll();

		const executionsMode = config.get('executions.mode') as string;

		if (executionsMode === 'queue') {
			this.jobQueue = Queue.getInstance().getBullObjectInstance();
		}
	}


	/**
	 * The process did send a hook message so execute the appropiate hook
	 *
	 * @param {WorkflowHooks} workflowHooks
	 * @param {IProcessMessageDataHook} hookData
	 * @memberof WorkflowRunner
	 */
	processHookMessage(workflowHooks: WorkflowHooks, hookData: IProcessMessageDataHook) {
		workflowHooks.executeHookFunctions(hookData.hook, hookData.parameters);
	}


	/**
	 * The process did error
	 *
	 * @param {ExecutionError} error
	 * @param {Date} startedAt
	 * @param {WorkflowExecuteMode} executionMode
	 * @param {string} executionId
	 * @memberof WorkflowRunner
	 */
	processError(error: ExecutionError, startedAt: Date, executionMode: WorkflowExecuteMode, executionId: string) {
		const fullRunData: IRun = {
			data: {
				resultData: {
					error,
					runData: {},
				},
			},
			finished: false,
			mode: executionMode,
			startedAt,
			stoppedAt: new Date(),
		};

		// Remove from active execution with empty data. That will
		// set the execution to failed.
		this.activeExecutions.remove(executionId, fullRunData);
	}

	/**
	 * Run the workflow
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async run(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean, realtime?: boolean): Promise<string> {
		const executionsProcess = config.get('executions.process') as string;
		const executionsMode = config.get('executions.mode') as string;

		let executionId: string;
		if (executionsMode === 'queue' && data.executionMode !== 'manual') {
			// Do not run "manual" executions in bull because sending events to the
			// frontend would not be possible
			executionId = await this.runBull(data, loadStaticData, realtime);
		} else if (executionsProcess === 'main') {
			executionId = await this.runMainProcess(data, loadStaticData);
		} else {
			executionId = await this.runSubprocess(data, loadStaticData);
		}

		const externalHooks = ExternalHooks();
		if (externalHooks.exists('workflow.postExecute')) {
			this.activeExecutions.getPostExecutePromise(executionId)
				.then(async (executionData) => {
					await externalHooks.run('workflow.postExecute', [executionData, data.workflowData]);
				})
				.catch(error => {
					console.error('There was a problem running hook "workflow.postExecute"', error);
				});
		}

		return executionId;
	}


	/**
	 * Run the workflow in current process
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async runMainProcess(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean): Promise<string> {
		if (loadStaticData === true && data.workflowData.id) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(data.workflowData.id as string);
		}

		const nodeTypes = NodeTypes();


		// Soft timeout to stop workflow execution after current running node
		// Changes were made by adding the `workflowTimeout` to the `additionalData`
		// So that the timeout will also work for executions with nested workflows.
		let executionTimeout: NodeJS.Timeout;
		let workflowTimeout = config.get('executions.timeout') as number; // initialize with default
		if (data.workflowData.settings && data.workflowData.settings.executionTimeout) {
			workflowTimeout = data.workflowData.settings!.executionTimeout as number; // preference on workflow setting
		}

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout') as number);
		}

		const workflow = new Workflow({ id: data.workflowData.id as string | undefined, name: data.workflowData.name, nodes: data.workflowData!.nodes, connections: data.workflowData!.connections, active: data.workflowData!.active, nodeTypes, staticData: data.workflowData!.staticData });
		const additionalData = await WorkflowExecuteAdditionalData.getBase(undefined, workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000);

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, undefined);
		Logger.verbose(`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`, {executionId});

		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId, true);

		let workflowExecution: PCancelable<IRun>;
		if (data.executionData !== undefined) {
			Logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {executionId});
			const workflowExecute = new WorkflowExecute(additionalData, data.executionMode, data.executionData);
			workflowExecution = workflowExecute.processRunExecutionData(workflow);
		} else if (data.runData === undefined || data.startNodes === undefined || data.startNodes.length === 0 || data.destinationNode === undefined) {
			Logger.debug(`Execution ID ${executionId} will run executing all nodes.`, {executionId});
			// Execute all nodes

			// Can execute without webhook so go on
			const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
			workflowExecution = workflowExecute.run(workflow, undefined, data.destinationNode);
		} else {
			Logger.debug(`Execution ID ${executionId} is a partial execution.`, {executionId});
			// Execute only the nodes between start and destination nodes
			const workflowExecute = new WorkflowExecute(additionalData, data.executionMode);
			workflowExecution = workflowExecute.runPartialWorkflow(workflow, data.runData, data.startNodes, data.destinationNode);
		}

		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);

		if (workflowTimeout > 0) {
			const timeout = Math.min(workflowTimeout, config.get('executions.maxTimeout') as number) * 1000; // as seconds
			executionTimeout = setTimeout(() => {
				this.activeExecutions.stopExecution(executionId, 'timeout');
			}, timeout);
		}

		workflowExecution.then((fullRunData) => {
			clearTimeout(executionTimeout);
			if (workflowExecution.isCanceled) {
				fullRunData.finished = false;
			}
			this.activeExecutions.remove(executionId, fullRunData);
		});

		return executionId;
	}

	async runBull(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean, realtime?: boolean): Promise<string> {

		// TODO: If "loadStaticData" is set to true it has to load data new on worker

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, undefined);

		const jobData: IBullJobData = {
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
		const job = await this.jobQueue.add(jobData, jobOptions);
		console.log('Started with ID: ' + job.id.toString());

		const hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerMain(data.executionMode, executionId, data.workflowData, { retryOf: data.retryOf ? data.retryOf.toString() : undefined });

		// Normally also workflow should be supplied here but as it only used for sending
		// data to editor-UI is not needed.
		hooks.executeHookFunctions('workflowExecuteBefore', []);

		const workflowExecution: PCancelable<IRun> = new PCancelable(async (resolve, reject, onCancel) => {
			onCancel.shouldReject = false;
			onCancel(async () => {
				await Queue.getInstance().stopJob(job);

				const fullRunData :IRun = {
					data: {
						resultData: {
							error: new WorkflowOperationError('Workflow has been canceled!'),
							runData: {},
						},
					},
					mode: data.executionMode,
					startedAt: new Date(),
					stoppedAt: new Date(),
				};
				this.activeExecutions.remove(executionId, fullRunData);
				resolve(fullRunData);
			});

			const jobData: Promise<IBullJobResponse> = job.finished();

			const queueRecoveryInterval = config.get('queue.bull.queueRecoveryInterval') as number;

			if (queueRecoveryInterval > 0) {
				/*************************************************
				 * Long explanation about what this solves:      *
				 * This only happens in a very specific scenario *
				 * when Redis crashes and recovers shortly       *
				 * but during this time, some execution(s)       *
				 * finished. The end result is that the main     *
				 * process will wait indefinitively and never    *
				 * get a response. This adds an active polling to*
				 * the queue that allows us to identify that the *
				 * execution finished and get information from   *
				 * the database.                                 *
				*************************************************/
				let watchDogInterval: NodeJS.Timeout | undefined;

				const watchDog = new Promise((res) => {
					watchDogInterval = setInterval(async () => {
						const currentJob = await this.jobQueue.getJob(job.id);
						// When null means job is finished (not found in queue)
						if (currentJob === null) {
							// Mimic worker's success message
							res({success: true});
						}
					}, queueRecoveryInterval * 1000);
				});


				const clearWatchdogInterval = () => {
					if (watchDogInterval) {
						clearInterval(watchDogInterval);
						watchDogInterval = undefined;
					}
				};

				await Promise.race([jobData, watchDog]);
				clearWatchdogInterval();

			} else {
				await jobData;
			}



			const executionDb = await Db.collections.Execution!.findOne(executionId) as IExecutionFlattedDb;
			const fullExecutionData = ResponseHelper.unflattenExecutionData(executionDb) as IExecutionResponse;
			const runData = {
				data: fullExecutionData.data,
				finished: fullExecutionData.finished,
				mode: fullExecutionData.mode,
				startedAt: fullExecutionData.startedAt,
				stoppedAt: fullExecutionData.stoppedAt,
			} as IRun;


			this.activeExecutions.remove(executionId, runData);
			// Normally also static data should be supplied here but as it only used for sending
			// data to editor-UI is not needed.
			hooks.executeHookFunctions('workflowExecuteAfter', [runData]);
			try {
				// Check if this execution data has to be removed from database
				// based on workflow settings.
				let saveDataErrorExecution = config.get('executions.saveDataOnError') as string;
				let saveDataSuccessExecution = config.get('executions.saveDataOnSuccess') as string;
				if (data.workflowData.settings !== undefined) {
					saveDataErrorExecution = (data.workflowData.settings.saveDataErrorExecution as string) || saveDataErrorExecution;
					saveDataSuccessExecution = (data.workflowData.settings.saveDataSuccessExecution as string) || saveDataSuccessExecution;
				}

				const workflowDidSucceed = !runData.data.resultData.error;
				if (workflowDidSucceed === true && saveDataSuccessExecution === 'none' ||
					workflowDidSucceed === false && saveDataErrorExecution === 'none'
				) {
					await Db.collections.Execution!.delete(executionId);
				}
			} catch (err) {
				// We don't want errors here to crash n8n. Just log and proceed.
				console.log('Error removing saved execution from database. More details: ', err);
			}

			resolve(runData);
		});

		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
		return executionId;
	}


	/**
	 * Run the workflow
	 *
	 * @param {IWorkflowExecutionDataProcess} data
	 * @param {boolean} [loadStaticData] If set will the static data be loaded from
	 *                                   the workflow and added to input data
	 * @returns {Promise<string>}
	 * @memberof WorkflowRunner
	 */
	async runSubprocess(data: IWorkflowExecutionDataProcess, loadStaticData?: boolean): Promise<string> {
		let startedAt = new Date();
		const subprocess = fork(pathJoin(__dirname, 'WorkflowRunnerProcess.js'));

		if (loadStaticData === true && data.workflowData.id) {
			data.workflowData.staticData = await WorkflowHelpers.getStaticDataById(data.workflowData.id as string);
		}

		// Register the active execution
		const executionId = await this.activeExecutions.add(data, subprocess);

		// Supply all nodeTypes and credentialTypes
		const nodeTypeData = WorkflowHelpers.getAllNodeTypeData() as ITransferNodeTypes;
		const credentialTypes = CredentialTypes();

		(data as unknown as IWorkflowExecutionDataProcessWithExecution).executionId = executionId;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).nodeTypeData = nodeTypeData;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).credentialsOverwrite = this.credentialsOverwrites;
		(data as unknown as IWorkflowExecutionDataProcessWithExecution).credentialsTypeData = credentialTypes.credentialTypes; // TODO: Still needs correct value

		const workflowHooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);

		// Send all data to subprocess it needs to run the workflow
		subprocess.send({ type: 'startWorkflow', data } as IProcessMessage);

		// Start timeout for the execution
		let executionTimeout: NodeJS.Timeout;
		let workflowTimeout = config.get('executions.timeout') as number; // initialize with default
		if (data.workflowData.settings && data.workflowData.settings.executionTimeout) {
			workflowTimeout = data.workflowData.settings!.executionTimeout as number; // preference on workflow setting
		}

		const processTimeoutFunction = (timeout: number) => {
			this.activeExecutions.stopExecution(executionId, 'timeout');
			executionTimeout = setTimeout(() => subprocess.kill(), Math.max(timeout * 0.2, 5000)); // minimum 5 seconds
		};

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.get('executions.maxTimeout') as number) * 1000; // as seconds
			// Start timeout already now but give process at least 5 seconds to start.
			// Without it could would it be possible that the workflow executions times out before it even got started if
			// the timeout time is very short as the process start time can be quite long.
			executionTimeout = setTimeout(processTimeoutFunction, Math.max(5000, workflowTimeout), workflowTimeout);
		}

		// Create a list of child spawned executions
		// If after the child process exits we have
		// outstanding executions, we remove them
		const childExecutionIds: string[] = [];

		// Listen to data from the subprocess
		subprocess.on('message', async (message: IProcessMessage) => {
			Logger.debug(`Received child process message of type ${message.type} for execution ID ${executionId}.`, {executionId});
			if (message.type === 'start') {
				// Now that the execution actually started set the timeout again so that does not time out to early.
				startedAt = new Date();
				if (workflowTimeout > 0) {
					clearTimeout(executionTimeout);
					executionTimeout = setTimeout(processTimeoutFunction, workflowTimeout, workflowTimeout);
				}

			} else if (message.type === 'end') {
				clearTimeout(executionTimeout);
				this.activeExecutions.remove(executionId!, message.data.runData);

			} else if (message.type === 'processError') {
				clearTimeout(executionTimeout);
				const executionError = message.data.executionError as ExecutionError;
				this.processError(executionError, startedAt, data.executionMode, executionId);

			} else if (message.type === 'processHook') {
				this.processHookMessage(workflowHooks, message.data as IProcessMessageDataHook);
			} else if (message.type === 'timeout') {
				// Execution timed out and its process has been terminated
				const timeoutError = new WorkflowOperationError('Workflow execution timed out!');

				this.processError(timeoutError, startedAt, data.executionMode, executionId);
			} else if (message.type === 'startExecution') {
				const executionId = await this.activeExecutions.add(message.data.runData);
				childExecutionIds.push(executionId);
				subprocess.send({ type: 'executionId', data: {executionId} } as IProcessMessage);
			} else if (message.type === 'finishExecution') {
				const executionIdIndex = childExecutionIds.indexOf(message.data.executionId);
				if (executionIdIndex !== -1) {
					childExecutionIds.splice(executionIdIndex, 1);
				}

				await this.activeExecutions.remove(message.data.executionId, message.data.result);
			}
		});

		// Also get informed when the processes does exit especially when it did crash or timed out
		subprocess.on('exit', async (code, signal) => {
			if (signal === 'SIGTERM'){
				Logger.debug(`Subprocess for execution ID ${executionId} timed out.`, {executionId});
				// Execution timed out and its process has been terminated
				const timeoutError = new WorkflowOperationError('Workflow execution timed out!');

				this.processError(timeoutError, startedAt, data.executionMode, executionId);
			} else if (code !== 0) {
				Logger.debug(`Subprocess for execution ID ${executionId} finished with error code ${code}.`, {executionId});
				// Process did exit with error code, so something went wrong.
				const executionError = new WorkflowOperationError('Workflow execution process did crash for an unknown reason!');

				this.processError(executionError, startedAt, data.executionMode, executionId);
			}

			for(const executionId of childExecutionIds) {
				// When the child process exits, if we still have
				// pending child executions, we mark them as finished
				// They will display as unknown to the user
				// Instead of pending forever as executing when it
				// actually isn't anymore.
				await this.activeExecutions.remove(executionId);
			}


			clearTimeout(executionTimeout);
		});

		return executionId;
	}
}
