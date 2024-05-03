/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Container, Service } from 'typedi';
import { WorkflowExecute } from 'n8n-core';

import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IPinData,
	IRun,
	WorkflowExecuteMode,
	WorkflowHooks,
} from 'n8n-workflow';
import {
	ErrorReporterProxy as ErrorReporter,
	Workflow,
	WorkflowOperationError,
} from 'n8n-workflow';

import PCancelable from 'p-cancelable';

import { ActiveExecutions } from '@/ActiveExecutions';
import config from '@/config';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { ExecutionDataRecoveryService } from '@/eventbus/executionDataRecovery.service';
import { ExternalHooks } from '@/ExternalHooks';
import type { IExecutionResponse, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import type { Job, JobData, JobResponse } from '@/Queue';
import { Queue } from '@/Queue';
import * as WorkflowHelpers from '@/WorkflowHelpers';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { generateFailedExecutionFromError } from '@/WorkflowHelpers';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import { InternalHooks } from '@/InternalHooks';
import { Logger } from '@/Logger';
import { WorkflowStaticDataService } from '@/workflows/workflowStaticData.service';

@Service()
export class WorkflowRunner {
	private jobQueue: Queue;

	private executionsMode = config.getEnv('executions.mode');

	constructor(
		private readonly logger: Logger,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly externalHooks: ExternalHooks,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly nodeTypes: NodeTypes,
		private readonly permissionChecker: PermissionChecker,
	) {
		if (this.executionsMode === 'queue') {
			this.jobQueue = Container.get(Queue);
		}
	}

	/** The process did error */
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
			const executionWithoutData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: false,
			});
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
			const eventBus = Container.get(MessageEventBus);
			const eventLogMessages = await eventBus.getEventsByExecutionId(executionId);
			// Attempt to recover more better runData from these messages (but don't update the execution db entry yet)
			if (eventLogMessages.length > 0) {
				const eventLogExecutionData = await Container.get(
					ExecutionDataRecoveryService,
				).recoverExecutionData(executionId, eventLogMessages, false);
				if (eventLogExecutionData) {
					fullRunData.data.resultData.runData = eventLogExecutionData.resultData.runData;
					fullRunData.status = 'crashed';
				}
			}

			const executionFlattedData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
			});

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

	/** Run the workflow */
	async run(
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
		restartExecutionId?: string,
		responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
	): Promise<string> {
		// Register a new execution
		const executionId = await this.activeExecutions.add(data, restartExecutionId);

		const { id: workflowId, nodes } = data.workflowData;
		try {
			await this.permissionChecker.check(workflowId, data.userId, nodes);
		} catch (error) {
			// Create a failed execution with the data for the node, save it and abort execution
			const runData = generateFailedExecutionFromError(data.executionMode, error, error.node);
			const workflowHooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);
			await workflowHooks.executeHookFunctions('workflowExecuteBefore', []);
			await workflowHooks.executeHookFunctions('workflowExecuteAfter', [runData]);
			responsePromise?.reject(error);
			this.activeExecutions.remove(executionId);
			return executionId;
		}

		if (responsePromise) {
			this.activeExecutions.attachResponsePromise(executionId, responsePromise);
		}

		if (this.executionsMode === 'queue' && data.executionMode !== 'manual') {
			// Do not run "manual" executions in bull because sending events to the
			// frontend would not be possible
			await this.enqueueExecution(executionId, data, loadStaticData, realtime);
		} else {
			await this.runMainProcess(executionId, data, loadStaticData, executionId);
			void Container.get(InternalHooks).onWorkflowBeforeExecute(executionId, data);
		}

		// only run these when not in queue mode or when the execution is manual,
		// since these calls are now done by the worker directly
		if (
			this.executionsMode !== 'queue' ||
			config.getEnv('generic.instanceType') === 'worker' ||
			data.executionMode === 'manual'
		) {
			const postExecutePromise = this.activeExecutions.getPostExecutePromise(executionId);
			postExecutePromise
				.then(async (executionData) => {
					void Container.get(InternalHooks).onWorkflowPostExecute(
						executionId,
						data.workflowData,
						executionData,
						data.userId,
					);
					if (this.externalHooks.exists('workflow.postExecute')) {
						try {
							await this.externalHooks.run('workflow.postExecute', [
								executionData,
								data.workflowData,
								executionId,
							]);
						} catch (error) {
							ErrorReporter.error(error);
							this.logger.error('There was a problem running hook "workflow.postExecute"', error);
						}
					}
				})
				.catch((error) => {
					ErrorReporter.error(error);
					this.logger.error(
						'There was a problem running internal hook "onWorkflowPostExecute"',
						error,
					);
				});
		}

		return executionId;
	}

	/** Run the workflow in current process */
	private async runMainProcess(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		restartExecutionId?: string,
	): Promise<void> {
		const workflowId = data.workflowData.id;
		if (loadStaticData === true && workflowId) {
			data.workflowData.staticData =
				await this.workflowStaticDataService.getStaticDataById(workflowId);
		}

		// Soft timeout to stop workflow execution after current running node
		// Changes were made by adding the `workflowTimeout` to the `additionalData`
		// So that the timeout will also work for executions with nested workflows.
		let executionTimeout: NodeJS.Timeout;

		const workflowSettings = data.workflowData.settings ?? {};
		let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout'); // initialize with default
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
		}

		let pinData: IPinData | undefined;
		if (data.executionMode === 'manual') {
			pinData = data.pinData ?? data.workflowData.pinData;
		}

		const workflow = new Workflow({
			id: workflowId,
			name: data.workflowData.name,
			nodes: data.workflowData.nodes,
			connections: data.workflowData.connections,
			active: data.workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData: data.workflowData.staticData,
			settings: workflowSettings,
			pinData,
		});
		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			data.userId,
			undefined,
			workflowTimeout <= 0 ? undefined : Date.now() + workflowTimeout * 1000,
		);
		// TODO: set this in queue mode as well
		additionalData.restartExecutionId = restartExecutionId;

		additionalData.executionId = executionId;

		this.logger.verbose(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);
		let workflowExecution: PCancelable<IRun>;
		await this.executionRepository.updateStatus(executionId, 'running');

		try {
			additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksMain(data, executionId);

			additionalData.hooks.hookFunctions.sendResponse = [
				async (response: IExecuteResponsePromiseData): Promise<void> => {
					this.activeExecutions.resolveResponsePromise(executionId, response);
				},
			];

			additionalData.setExecutionStatus = WorkflowExecuteAdditionalData.setExecutionStatus.bind({
				executionId,
			});

			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({
				pushRef: data.pushRef,
			});

			await additionalData.hooks.executeHookFunctions('workflowExecuteBefore', []);
			if (data.executionData !== undefined) {
				this.logger.debug(`Execution ID ${executionId} had Execution data. Running with payload.`, {
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
				this.logger.debug(`Execution ID ${executionId} will run executing all nodes.`, {
					executionId,
				});
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
				this.logger.debug(`Execution ID ${executionId} is a partial execution.`, { executionId });
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
					void this.activeExecutions.stopExecution(executionId);
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
				.catch(
					async (error) =>
						await this.processError(
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
	}

	private async enqueueExecution(
		executionId: string,
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
	): Promise<void> {
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

			this.logger.info(`Started with job ID: ${job.id.toString()} (Execution ID: ${executionId})`);

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

				try {
					await Promise.race(racingPromises);
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
					this.logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
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
					this.logger.debug(
						`Reading execution data for execution ${executionId} from db for PostExecutionPromise.`,
					);
				} else {
					this.logger.debug(
						`Skipping execution data for execution ${executionId} since there are no PostExecutionPromise.`,
					);
				}

				const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
					includeData: executionHasPostExecutionPromises,
					unflattenData: executionHasPostExecutionPromises,
				});
				if (!fullExecutionData) {
					return reject(new Error(`Could not find execution with id "${executionId}"`));
				}

				const runData: IRun = {
					data: {},
					finished: fullExecutionData.finished,
					mode: fullExecutionData.mode,
					startedAt: fullExecutionData.startedAt,
					stoppedAt: fullExecutionData.stoppedAt,
					status: fullExecutionData.status,
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

				resolve(runData);
			},
		);

		workflowExecution.catch(() => {
			// We `reject` this promise if the execution fails
			// but the error is handled already by processError
			// So we're just preventing crashes here.
		});

		this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);
	}
}
