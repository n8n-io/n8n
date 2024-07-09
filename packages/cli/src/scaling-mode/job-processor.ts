import { Service } from 'typedi';
import { ApplicationError, Workflow } from 'n8n-workflow';
import { Logger } from '@/Logger';
import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import * as WorkflowExecuteAdditionalData from '@/WorkflowExecuteAdditionalData';
import { NodeTypes } from '@/NodeTypes';
import { encodeWebhookResponse } from './webhook-response';
import { WorkflowExecute } from 'n8n-core';
import type { ExecutionStatus, IExecuteResponsePromiseData, IRun } from 'n8n-workflow';
import type { Job, JobId, JobResult, RunningJobProps, WebhookResponseReport } from './types';
import type PCancelable from 'p-cancelable';
import { RunningJobs } from './running-jobs';

@Service()
export class JobProcessor {
	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly runningJobs: RunningJobs,
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

		await this.executionRepository.updateStatus(executionId, 'running');

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
				const webhookResponseReport: WebhookResponseReport = {
					kind: 'webhook-response',
					executionId,
					response: encodeWebhookResponse(response),
				};

				await job.progress(webhookResponseReport);
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

		const props: RunningJobProps = {
			run: workflowRun,
			executionId,
			workflowId: execution.workflowId,
			workflowName: execution.workflowData.name,
			mode: execution.mode,
			startedAt: execution.startedAt,
			retryOf: execution.retryOf ?? '',
			status: execution.status,
		};

		this.runningJobs.set(job.id, props);

		await workflowRun;

		this.runningJobs.clear(job.id);

		this.logger.debug('[JobProcessor] Job finished running', { jobId: job.id });

		/**
		 * @important Do NOT call `workflowExecuteAfter` hook here.
		 * It is being called from processSuccessExecution() already.
		 */

		return { success: true };
	}

	stopJob(jobId: JobId) {
		this.runningJobs.cancel(jobId);
		this.runningJobs.clear(jobId);
	}

	getRunningJobIds() {
		return this.runningJobs.getIds();
	}

	getRunningJobsSummary() {
		return this.runningJobs.getSummaries();
	}
}
