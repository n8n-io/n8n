import type { RunningJobSummary } from '@n8n/api-types';
import { WorkflowExecute } from 'n8n-core';
import { BINARY_ENCODING, ApplicationError, Workflow } from 'n8n-workflow';
import type { ExecutionStatus, IExecuteResponsePromiseData, IRun } from 'n8n-workflow';
import type PCancelable from 'p-cancelable';
import { Service } from 'typedi';

import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { Logger } from '@/logging/logger.service';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

import type { Job, JobId, JobResult, RunningJob } from './scaling.types';

/**
 * Responsible for processing jobs from the queue, i.e. running enqueued executions.
 */
@Service()
export class JobProcessor {
	private readonly runningJobs: Record<JobId, RunningJob> = {};

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	async processJob(job: Job): Promise<JobResult> {
		const { executionId, loadStaticData } = job.data;

		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) {
			this.logger.error('[JobProcessor] Failed to find execution data', { executionId });
			throw new ApplicationError('Failed to find execution data. Aborting execution.', {
				extra: { executionId },
			});
		}

		const workflowId = execution.workflowData.id;

		this.logger.info(`[JobProcessor] Starting job ${job.id} (execution ${executionId})`);

		const startedAt = await this.executionRepository.setRunning(executionId);

		let { staticData } = execution.workflowData;

		if (loadStaticData) {
			const workflowData = await this.workflowRepository.findOne({
				select: ['id', 'staticData'],
				where: { id: workflowId },
			});

			if (workflowData === null) {
				this.logger.error('[JobProcessor] Failed to find workflow', { workflowId, executionId });
				throw new ApplicationError('Failed to find workflow', { extra: { workflowId } });
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

		additionalData.hooks = WorkflowExecuteAdditionalData.getWorkflowHooksWorkerExecuter(
			execution.mode,
			job.data.executionId,
			execution.workflowData,
			{ retryOf: execution.retryOf as string },
		);

		additionalData.hooks.hookFunctions.sendResponse = [
			async (response: IExecuteResponsePromiseData): Promise<void> => {
				await job.progress({
					kind: 'respond-to-webhook',
					executionId,
					response: this.encodeWebhookResponse(response),
				});
			},
		];

		additionalData.executionId = executionId;

		additionalData.setExecutionStatus = (status: ExecutionStatus) => {
			// Can't set the status directly in the queued worker, but it will happen in InternalHook.onWorkflowPostExecute
			this.logger.debug(
				`[JobProcessor] Queued worker execution status for ${executionId} is "${status}"`,
			);
		};

		let workflowExecute: WorkflowExecute;
		let workflowRun: PCancelable<IRun>;
		if (execution.data !== undefined) {
			workflowExecute = new WorkflowExecute(additionalData, execution.mode, execution.data);
			workflowRun = workflowExecute.processRunExecutionData(workflow);
		} else {
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

		this.logger.debug('[JobProcessor] Job finished running', { jobId: job.id, executionId });

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
}
