import type { RunningJobSummary } from '@n8n/api-types';
import { Service } from '@n8n/di';
import {
	WorkflowHasIssuesError,
	InstanceSettings,
	WorkflowExecute,
	ErrorReporter,
	Logger,
	isObjectLiteral,
} from 'n8n-core';
import type {
	ExecutionStatus,
	IExecuteResponsePromiseData,
	IRun,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import {
	BINARY_ENCODING,
	ApplicationError,
	Workflow,
	jsonStringify,
	ensureError,
	sleep,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { getWorkflowHooksWorkerExecuter } from '@/execution-lifecycle/execution-lifecycle-hooks';
import { ManualExecutionService } from '@/manual-execution.service';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type {
	Job,
	JobFailedMessage,
	JobFinishedMessage,
	JobId,
	JobMessage,
	JobQueue,
	JobResult,
	RespondToWebhookMessage,
	RunningJob,
} from './scaling.types';
import { JOB_TYPE_NAME } from './constants';
import { JobQueues } from './job-queues';
import { OnShutdown } from '@/decorators/on-shutdown';
import { HIGHEST_SHUTDOWN_PRIORITY } from '@/constants';

/**
 * Responsible for processing jobs from the queues, i.e. running enqueued executions.
 */
@Service()
export class JobProcessor {
	private readonly runningJobs: Record<JobId, RunningJob> = {};

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly jobQueues: JobQueues,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly instanceSettings: InstanceSettings,
		private readonly manualExecutionService: ManualExecutionService,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	setup(concurrency: number) {
		this.assertWorker();

		const queues = this.jobQueues.getAllQueues();
		for (const queue of queues) {
			this.setupQueueProcessing(queue, concurrency);
		}
	}

	@OnShutdown(HIGHEST_SHUTDOWN_PRIORITY)
	async stop() {
		let count = 0;

		while (this.getRunningJobsCount() !== 0) {
			if (count++ % 4 === 0) {
				this.logger.info(
					`Waiting for ${this.getRunningJobsCount()} active executions to finish...`,
				);
			}

			await sleep(500);
		}
	}

	private getRunningJobsCount() {
		return this.getRunningJobIds().length;
	}

	private setupQueueProcessing(queue: JobQueue, concurrency: number) {
		queue.on('global:progress', (jobId: JobId, msg: unknown) => this.onProgress(jobId, msg));
		queue.on('error', (error: Error) => this.onError(error));
		void queue.process(JOB_TYPE_NAME, concurrency, async (job: Job) => this.preProcessJob(job));
	}

	private onProgress(jobId: JobId, msg: unknown) {
		if (!this.isJobMessage(msg)) return;

		if (msg.kind === 'abort-job') this.stopJob(jobId);
	}

	private onError(error: Error) {
		if ('code' in error && error.code === 'ECONNREFUSED') return; // handled by RedisClientService.retryStrategy

		/**
		 * Non-recoverable error on worker start with Redis unavailable.
		 * Even if Redis recovers, worker will remain unable to process jobs.
		 */
		if (error.message.includes('Error initializing Lua scripts')) {
			this.logger.error('Fatal error initializing worker', { error });
			this.logger.error('Exiting process...');
			process.exit(1);
		}

		this.logger.error('Queue errored', { error });

		throw error;
	}

	private async preProcessJob(job: Job) {
		try {
			if (!this.hasValidJobData(job)) {
				throw new ApplicationError('Worker received invalid job', {
					extra: { jobData: jsonStringify(job, { replaceCircularRefs: true }) },
				});
			}

			await this.processJob(job);
		} catch (error) {
			await this.reportJobProcessingError(ensureError(error), job);
		}
	}

	async processJob(job: Job): Promise<JobResult> {
		const { executionId, loadStaticData } = job.data;

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			throw new ApplicationError(
				`Worker failed to find data for execution ${executionId} (job ${job.id})`,
				{ level: 'warning' },
			);
		}

		/**
		 * Bull's implicit retry mechanism and n8n's execution recovery mechanism may
		 * cause a crashed execution to be enqueued. We refrain from processing it,
		 * until we have reworked both mechanisms to prevent this scenario.
		 */
		if (execution.status === 'crashed') return { success: false };

		const workflowId = execution.workflowData.id;

		this.logger.info(`Worker started execution ${executionId} (job ${job.id})`, {
			executionId,
			jobId: job.id,
		});

		const startedAt = await this.executionRepository.setRunning(executionId);

		let { staticData } = execution.workflowData;

		if (loadStaticData) {
			const workflowData = await this.workflowRepository.findOne({
				select: ['id', 'staticData'],
				where: { id: workflowId },
			});

			if (workflowData === null) {
				throw new ApplicationError(
					`Worker failed to find workflow ${workflowId} to run execution ${executionId} (job ${job.id})`,
					{ level: 'warning' },
				);
			}

			staticData = workflowData.staticData;
		}

		const workflowSettings = execution.workflowData.settings ?? {};

		let workflowTimeout = workflowSettings.executionTimeout ?? config.getEnv('executions.timeout');

		let executionTimeoutTimestamp: number | undefined;

		if (workflowTimeout > 0) {
			workflowTimeout = Math.min(workflowTimeout, config.getEnv('executions.maxTimeout'));
			executionTimeoutTimestamp = Date.now() + workflowTimeout * 1000;
		}

		const workflow = new Workflow({
			id: workflowId,
			name: execution.workflowData.name,
			nodes: execution.workflowData.nodes,
			connections: execution.workflowData.connections,
			active: execution.workflowData.active,
			nodeTypes: this.nodeTypes,
			staticData,
			settings: execution.workflowData.settings,
		});

		const additionalData = await WorkflowExecuteAdditionalData.getBase(
			undefined,
			undefined,
			executionTimeoutTimestamp,
		);

		const { pushRef } = job.data;

		additionalData.hooks = getWorkflowHooksWorkerExecuter(
			execution.mode,
			job.data.executionId,
			execution.workflowData,
			{ retryOf: execution.retryOf as string, pushRef },
		);

		if (pushRef) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			additionalData.sendDataToUI = WorkflowExecuteAdditionalData.sendDataToUI.bind({ pushRef });
		}

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				const msg: RespondToWebhookMessage = {
					kind: 'respond-to-webhook',
					executionId,
					response: this.encodeWebhookResponse(response),
					workerId: this.instanceSettings.hostId,
				};

				await job.progress(msg);
			},
		];

		additionalData.executionId = executionId;

		additionalData.setExecutionStatus = (status: ExecutionStatus) => {
			// Can't set the status directly in the queued worker, but it will happen in InternalHook.onWorkflowPostExecute
			this.logger.debug(
				`Queued worker execution status for execution ${executionId} (job ${job.id}) is "${status}"`,
			);
		};

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;

		const { startData, resultData, manualData, isTestWebhook } = execution.data;

		if (execution.mode === 'manual' && !isTestWebhook) {
			const data: IWorkflowExecutionDataProcess = {
				executionMode: execution.mode,
				workflowData: execution.workflowData,
				destinationNode: startData?.destinationNode,
				startNodes: startData?.startNodes,
				runData: resultData.runData,
				pinData: resultData.pinData,
				partialExecutionVersion: manualData?.partialExecutionVersion,
				dirtyNodeNames: manualData?.dirtyNodeNames,
				triggerToStartFrom: manualData?.triggerToStartFrom,
				userId: manualData?.userId,
			};

			try {
				workflowRun = this.manualExecutionService.runManually(
					data,
					workflow,
					additionalData,
					executionId,
					resultData.pinData,
				);
			} catch (error) {
				if (error instanceof WorkflowHasIssuesError) {
					// execution did not even start, but we call `workflowExecuteAfter` to notify main

					const now = new Date();
					const runData: IRun = {
						mode: 'manual',
						status: 'error',
						finished: false,
						startedAt: now,
						stoppedAt: now,
						data: { resultData: { error, runData: {} } },
					};

					await additionalData.hooks.executeHookFunctions('workflowExecuteAfter', [runData]);
					return { success: false };
				}
				throw error;
			}
		} else if (execution.data !== undefined) {
			workflowExecute = new WorkflowExecute(additionalData, execution.mode, execution.data);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
			this.errorReporter.info(`Worker found execution ${executionId} without data`);
			// Execute all nodes
			// Can execute without webhook so go on
			workflowExecute = new WorkflowExecute(additionalData, execution.mode);
			workflowRun = workflowExecute.run(workflow);
		}

		const runningJob: RunningJob = {
			run: workflowRun,
			executionId,
			workflowId: execution.workflowId,
			workflowName: execution.workflowData.name,
			mode: execution.mode,
			startedAt,
			retryOf: execution.retryOf ?? '',
			status: execution.status,
		};

		this.runningJobs[job.id] = runningJob;

		await workflowRun;

		delete this.runningJobs[job.id];

		this.logger.info(`Worker finished execution ${executionId} (job ${job.id})`, {
			executionId,
			jobId: job.id,
		});

		const msg: JobFinishedMessage = {
			kind: 'job-finished',
			executionId,
			workerId: this.instanceSettings.hostId,
		};

		await job.progress(msg);

		/**
		 * @important Do NOT call `workflowExecuteAfter` hook here.
		 * It is being called from processSuccessExecution() already.
		 */

		return { success: true };
	}

	stopJob(jobId: JobId) {
		this.runningJobs[jobId]?.run.cancel();
		delete this.runningJobs[jobId];
	}

	getRunningJobIds(): JobId[] {
		return Object.keys(this.runningJobs);
	}

	getRunningJobsSummary(): RunningJobSummary[] {
		return Object.values(this.runningJobs).map(({ run, ...summary }) => summary);
	}

	private encodeWebhookResponse(
		response: IExecuteResponsePromiseData,
	): IExecuteResponsePromiseData {
		if (typeof response === 'object' && Buffer.isBuffer(response.body)) {
			response.body = {
				'__@N8nEncodedBuffer@__': response.body.toString(BINARY_ENCODING),
			};
		}

		return response;
	}

	private assertWorker() {
		if (this.instanceSettings.instanceType === 'worker') return;

		throw new ApplicationError('This method must be called on a `worker` instance');
	}

	/** Whether the argument is a message sent via Bull's internal pubsub setup. */
	private isJobMessage(candidate: unknown): candidate is JobMessage {
		return typeof candidate === 'object' && candidate !== null && 'kind' in candidate;
	}

	private hasValidJobData(job: Job) {
		return isObjectLiteral(job.data) && 'executionId' in job.data && 'loadStaticData' in job.data;
	}

	private async reportJobProcessingError(error: Error, job: Job) {
		const { executionId } = job.data;

		this.logger.error(`Worker errored while running execution ${executionId} (job ${job.id})`, {
			error,
			executionId,
			jobId: job.id,
		});

		const msg: JobFailedMessage = {
			kind: 'job-failed',
			executionId,
			workerId: this.instanceSettings.hostId,
			errorMsg: error.message,
			errorStack: error.stack ?? '',
		};

		await job.progress(msg);

		this.errorReporter.error(error, { executionId });

		throw error;
	}
}
