/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { ExecutionLifecycleHooks } from 'n8n-core';
import { ErrorReporter, InstanceSettings, WorkflowExecute } from 'n8n-core';
import type {
	ExecutionError,
	IDeferredPromise,
	IExecuteResponsePromiseData,
	IPinData,
	IRun,
	WorkflowExecuteMode,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { ExecutionCancelledError, Workflow } from 'n8n-workflow';
import PCancelable from 'p-cancelable';

import { ActiveExecutions } from '@/active-executions';
import config from '@/config';
import { ExecutionNotFoundError } from '@/errors/execution-not-found-error';
import { MaxStalledCountError } from '@/errors/max-stalled-count.error';
// eslint-disable-next-line import-x/no-cycle
import {
	getLifecycleHooksForRegularMain,
	getLifecycleHooksForScalingWorker,
	getLifecycleHooksForScalingMain,
} from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ExecutionDataService } from '@/executions/execution-data.service';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { ManualExecutionService } from '@/manual-execution.service';
import { NodeTypes } from '@/node-types';
import type { ScalingService } from '@/scaling/scaling.service';
import type { Job, JobData } from '@/scaling/scaling.types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowStaticDataService } from '@/workflows/workflow-static-data.service';

import { EventService } from './events/event.service';

@Service()
export class WorkflowRunner {
	private scalingService: ScalingService;

	private executionsMode = config.getEnv('executions.mode');

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowStaticDataService: WorkflowStaticDataService,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsPermissionChecker: CredentialsPermissionChecker,
		private readonly instanceSettings: InstanceSettings,
		private readonly manualExecutionService: ManualExecutionService,
		private readonly executionDataService: ExecutionDataService,
		private readonly eventService: EventService,
		private readonly executionsConfig: ExecutionsConfig,
	) {}

	setExecutionMode(mode: 'regular' | 'queue') {
		this.executionsMode = mode;
	}

	/** The process did error */
	async processError(
		error: ExecutionError | ExecutionNotFoundError,
		startedAt: Date,
		executionMode: WorkflowExecuteMode,
		executionId: string,
		hooks?: ExecutionLifecycleHooks,
	) {
		// This means the execution was probably cancelled and has already
		// been cleaned up.
		//
		// FIXME: This is a quick fix. The proper fix would be to not remove
		// the execution from the active executions while it's still running.
		if (
			error instanceof ExecutionNotFoundError ||
			error instanceof ExecutionCancelledError ||
			(typeof error.message === 'string' && error.message.includes('cancelled'))
		) {
			return;
		}

		this.logger.error(`Problem with execution ${executionId}: ${error.message}. Aborting.`);
		this.errorReporter.error(error, { executionId });

		const isQueueMode = config.getEnv('executions.mode') === 'queue';

		// in queue mode, first do a sanity run for the edge case that the execution was not marked as stalled
		// by Bull even though it executed successfully, see https://github.com/OptimalBits/bull/issues/1415

		if (isQueueMode) {
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

		// Remove from active execution with empty data. That will
		// set the execution to failed.
		this.activeExecutions.finalizeExecution(executionId, fullRunData);

		await hooks?.runHook('workflowExecuteAfter', [fullRunData]);
	}

	/** Run the workflow
	 * @param realtime This is used in queue mode to change the priority of an execution, making sure they are picked up quicker.
	 */
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
			await this.credentialsPermissionChecker.check(workflowId, nodes);
		} catch (error) {
			// Create a failed execution with the data for the node, save it and abort execution
			const runData = this.executionDataService.generateFailedExecutionFromError(
				data.executionMode,
				error,
				error.node,
			);
			const lifecycleHooks = getLifecycleHooksForRegularMain(data, executionId);
			await lifecycleHooks.runHook('workflowExecuteBefore', [undefined, data.executionData]);
			await lifecycleHooks.runHook('workflowExecuteAfter', [runData]);
			responsePromise?.reject(error);
			this.activeExecutions.finalizeExecution(executionId);
			return executionId;
		}

		if (responsePromise) {
			this.activeExecutions.attachResponsePromise(executionId, responsePromise);
		}

		// @TODO: Reduce to true branch once feature is stable
		const shouldEnqueue =
			process.env.OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS === 'true'
				? this.executionsMode === 'queue'
				: this.executionsMode === 'queue' && data.executionMode !== 'manual';

		if (shouldEnqueue) {
			await this.enqueueExecution(executionId, workflowId, data, loadStaticData, realtime);
		} else {
			await this.runMainProcess(executionId, data, loadStaticData, restartExecutionId);
		}

		// only run these when not in queue mode or when the execution is manual,
		// since these calls are now done by the worker directly
		if (
			this.executionsMode !== 'queue' ||
			this.instanceSettings.instanceType === 'worker' ||
			data.executionMode === 'manual'
		) {
			const postExecutePromise = this.activeExecutions.getPostExecutePromise(executionId);
			postExecutePromise.catch((error) => {
				if (error instanceof ExecutionCancelledError) return;
				this.errorReporter.error(error, {
					extra: { executionId, workflowId },
				});
				this.logger.error('There was an error in the post-execution promise', {
					error,
					executionId,
					workflowId,
				});
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
		let workflowTimeout = workflowSettings.executionTimeout ?? this.executionsConfig.timeout; // initialize with default
		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, this.executionsConfig.maxTimeout);
		}

		let pinData: IPinData | undefined;
		if (['manual', 'evaluation'].includes(data.executionMode)) {
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
		additionalData.streamingEnabled = data.streamingEnabled;

		additionalData.executionId = executionId;

		this.logger.debug(
			`Execution for workflow ${data.workflowData.name} was assigned id ${executionId}`,
			{ executionId },
		);
		let workflowExecution: PCancelable<IRun>;
		await this.executionRepository.setRunning(executionId); // write

		try {
			const lifecycleHooks = getLifecycleHooksForRegularMain(data, executionId);
			additionalData.hooks = lifecycleHooks;

			lifecycleHooks.addHandler('sendResponse', (response) => {
				this.activeExecutions.resolveResponsePromise(executionId, response);
			});

			if (data.streamingEnabled) {
				lifecycleHooks.addHandler('sendChunk', (chunk) => {
					data.httpResponse?.write(JSON.stringify(chunk) + '\n');
					data.httpResponse?.flush?.();
				});
			}

			additionalData.setExecutionStatus = WorkflowExecuteAdditionalData.setExecutionStatus.bind({
				executionId,
			});

			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({
				pushRef: data.pushRef,
			});

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
			} else {
				workflowExecution = this.manualExecutionService.runManually(
					data,
					workflow,
					additionalData,
					executionId,
					pinData,
				);
			}

			this.activeExecutions.attachWorkflowExecution(executionId, workflowExecution);

			if (workflowTimeout > 0) {
				let timeout = Math.min(workflowTimeout, this.executionsConfig.maxTimeout) * 1000; // as milliseconds
				if (data.startedAt && data.startedAt instanceof Date) {
					// If startedAt is set, we calculate the timeout based on the startedAt time
					// This is useful for executions that were waiting in a waiting state
					// and we want to ensure the timeout is relative to when the execution started.
					const now = Date.now();
					timeout = Math.max(timeout - (now - data.startedAt.getTime()), 0);
				}
				if (timeout === 0) {
					this.activeExecutions.stopExecution(executionId);
				} else {
					executionTimeout = setTimeout(() => {
						void this.activeExecutions.stopExecution(executionId);
					}, timeout);
				}
			}

			workflowExecution
				.then((fullRunData) => {
					clearTimeout(executionTimeout);
					if (workflowExecution.isCanceled) {
						fullRunData.finished = false;
					}
					fullRunData.status = this.activeExecutions.getStatus(executionId);
					this.activeExecutions.resolveExecutionResponsePromise(executionId);
					this.activeExecutions.finalizeExecution(executionId, fullRunData);
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
		workflowId: string,
		data: IWorkflowExecutionDataProcess,
		loadStaticData?: boolean,
		realtime?: boolean,
	): Promise<void> {
		const jobData: JobData = {
			workflowId,
			executionId,
			loadStaticData: !!loadStaticData,
			pushRef: data.pushRef,
			streamingEnabled: data.streamingEnabled,
		};

		if (!this.scalingService) {
			const { ScalingService } = await import('@/scaling/scaling.service');
			this.scalingService = Container.get(ScalingService);
			await this.scalingService.setupQueue();
		}

		// TODO: For realtime jobs should probably also not do retry or not retry if they are older than x seconds.
		//       Check if they get retried by default and how often.
		let job: Job;
		let lifecycleHooks: ExecutionLifecycleHooks;
		try {
			job = await this.scalingService.addJob(jobData, { priority: realtime ? 50 : 100 });

			lifecycleHooks = getLifecycleHooksForScalingMain(data, executionId);

			// Normally also workflow should be supplied here but as it only used for sending
			// data to editor-UI is not needed.
			await lifecycleHooks.runHook('workflowExecuteBefore', [undefined, data.executionData]);
		} catch (error) {
			// We use "getLifecycleHooksForScalingWorker" as "getLifecycleHooksForScalingMain" does not contain the
			// "workflowExecuteAfter" which we require.
			const lifecycleHooks = getLifecycleHooksForScalingWorker(data, executionId);
			await this.processError(error, new Date(), data.executionMode, executionId, lifecycleHooks);
			throw error;
		}

		const workflowExecution: PCancelable<IRun> = new PCancelable(
			async (resolve, reject, onCancel) => {
				onCancel.shouldReject = false;
				onCancel(async () => {
					await this.scalingService.stopJob(job);

					// We use "getLifecycleHooksForScalingWorker" as "getLifecycleHooksForScalingMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const lifecycleHooks = getLifecycleHooksForScalingWorker(data, executionId);
					const error = new ExecutionCancelledError(executionId);
					await this.processError(
						error,
						new Date(),
						data.executionMode,
						executionId,
						lifecycleHooks,
					);

					reject(error);
				});

				try {
					await job.finished();
				} catch (error) {
					if (
						error instanceof Error &&
						typeof error.message === 'string' &&
						error.message.includes('job stalled more than maxStalledCount')
					) {
						error = new MaxStalledCountError(error);
						this.eventService.emit('job-stalled', {
							executionId: job.data.executionId,
							workflowId: job.data.workflowId,
							hostId: this.instanceSettings.hostId,
							jobId: job.id.toString(),
						});
					}

					// We use "getLifecycleHooksForScalingWorker" as "getLifecycleHooksForScalingMain" does not contain the
					// "workflowExecuteAfter" which we require.
					const lifecycleHooks = getLifecycleHooksForScalingWorker(data, executionId);

					await this.processError(
						error,
						new Date(),
						data.executionMode,
						executionId,
						lifecycleHooks,
					);

					reject(error);
				}

				const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
					includeData: true,
					unflattenData: true,
				});
				if (!fullExecutionData) {
					return reject(new Error(`Could not find execution with id "${executionId}"`));
				}

				const runData: IRun = {
					finished: fullExecutionData.finished,
					mode: fullExecutionData.mode,
					startedAt: fullExecutionData.startedAt,
					stoppedAt: fullExecutionData.stoppedAt,
					status: fullExecutionData.status,
					data: fullExecutionData.data,
					jobId: job.id.toString(),
				};

				this.activeExecutions.finalizeExecution(executionId, runData);

				// Normally also static data should be supplied here but as it only used for sending
				// data to editor-UI is not needed.
				await lifecycleHooks.runHook('workflowExecuteAfter', [runData]);

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
