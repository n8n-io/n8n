import { Service } from 'typedi';
import { In, Not, type FindOptionsWhere } from 'typeorm';
import type { ExecutionStatus, IExecutionsSummary } from 'n8n-workflow';

import { ActiveExecutions } from '@/ActiveExecutions';
import type { ExecutionEntity } from '@db/entities/ExecutionEntity';
import type { User } from '@db/entities/User';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { getStatusUsingPreviousExecutionStatusMethod } from '@/executions/executionHelpers';
import type { IExecutionBase, IExecutionsStopData } from '@/Interfaces';
import { Queue } from '@/Queue';
import { WaitTracker } from '@/WaitTracker';
import { Logger } from '@/Logger';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';

export interface ActiveExecutionsQueryFilter {
	workflowId?: string;

	status?: ExecutionStatus;

	finished?: boolean;
}

@Service()
export class ActiveExecutionsService {
	constructor(
		private readonly logger: Logger,
		private readonly queue: Queue,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly waitTracker: WaitTracker,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	async getQueueModeExecutions(user: User, filter: ActiveExecutionsQueryFilter) {
		const currentJobs = await this.queue.getJobs(['active', 'waiting']);

		const currentlyRunningQueueIds = currentJobs.map((job) => job.data.executionId);

		const currentlyRunningManualExecutions = this.activeExecutions.getActiveExecutions();
		const manualExecutionIds = currentlyRunningManualExecutions.map((execution) => execution.id);

		const currentlyRunningExecutionIds = currentlyRunningQueueIds.concat(manualExecutionIds);

		if (!currentlyRunningExecutionIds.length) return [];

		const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user);
		if (!sharedWorkflowIds.length) return [];

		const where: FindOptionsWhere<ExecutionEntity> = {
			id: In(currentlyRunningExecutionIds),
			status: Not(In(['finished', 'stopped', 'failed', 'crashed'] as ExecutionStatus[])),
		};

		if (filter) {
			const { workflowId, status, finished } = filter;
			if (workflowId && sharedWorkflowIds.includes(workflowId)) {
				where.workflowId = workflowId;
			} else {
				where.workflowId = In(sharedWorkflowIds);
			}
			if (status) {
				// @ts-ignore
				where.status = In(status);
			}
			if (finished !== undefined) {
				where.finished = finished;
			}
		} else {
			where.workflowId = In(sharedWorkflowIds);
		}

		const executions = await this.executionRepository.findMultipleExecutions({
			select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt', 'stoppedAt', 'status'],
			order: { id: 'DESC' },
			where,
		});

		if (!executions.length) return [];

		return executions.map((execution) => {
			if (!execution.status) {
				execution.status = getStatusUsingPreviousExecutionStatusMethod(execution);
			}
			return {
				id: execution.id,
				workflowId: execution.workflowId,
				mode: execution.mode,
				retryOf: execution.retryOf !== null ? execution.retryOf : undefined,
				startedAt: new Date(execution.startedAt),
				status: execution.status ?? null,
				stoppedAt: execution.stoppedAt ?? null,
			} as IExecutionsSummary;
		});
	}

	async getRegularModeExecutions(user: User, filter: ActiveExecutionsQueryFilter) {
		const executingWorkflows = this.activeExecutions.getActiveExecutions();

		const returnData: IExecutionsSummary[] = [];

		const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user);

		for (const data of executingWorkflows) {
			if (
				(filter.workflowId !== undefined && filter.workflowId !== data.workflowId) ||
				(data.workflowId !== undefined && !sharedWorkflowIds.includes(data.workflowId))
			) {
				continue;
			}

			returnData.push({
				id: data.id,
				workflowId: data.workflowId ?? '',
				mode: data.mode,
				retryOf: data.retryOf,
				startedAt: new Date(data.startedAt),
				status: data.status,
			});
		}

		returnData.sort((a, b) => Number(b.id) - Number(a.id));

		return returnData;
	}

	async findExecution(user: User, executionId: string) {
		const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user);
		if (!sharedWorkflowIds.length) {
			throw new NotFoundError('Execution not found');
		}

		return this.executionRepository.findSingleExecution(executionId, {
			where: {
				workflowId: In(sharedWorkflowIds),
			},
		});
	}

	async stopQueueModeExecution(execution: IExecutionBase): Promise<IExecutionsStopData> {
		// Manual executions should still be stoppable, so
		// try notifying the `activeExecutions` to stop it.
		const result = await this.activeExecutions.stopExecution(execution.id);

		if (result === undefined) {
			// If active execution could not be found check if it is a waiting one
			try {
				return await this.waitTracker.stopExecution(execution.id);
			} catch (error) {
				// Ignore, if it errors as then it is probably a currently running
				// execution
			}
		} else {
			return {
				mode: result.mode,
				startedAt: new Date(result.startedAt),
				stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
				finished: result.finished,
				status: result.status,
			};
		}

		const currentJobs = await this.queue.getJobs(['active', 'waiting']);

		const job = currentJobs.find(({ data }) => data.executionId === execution.id);

		if (!job) {
			this.logger.debug('Could not stop job because it is no longer in queue', {
				jobId: execution.id,
			});
		} else {
			await this.queue.stopJob(job);
		}

		return {
			mode: execution.mode,
			startedAt: new Date(execution.startedAt),
			stoppedAt: execution.stoppedAt ? new Date(execution.stoppedAt) : undefined,
			finished: execution.finished,
			status: execution.status,
		};
	}

	async stopRegularModeExecution(execution: IExecutionBase) {
		// Stop the execution and wait till it is done and we got the data
		const result = await this.activeExecutions.stopExecution(execution.id);

		let returnData: IExecutionsStopData;
		if (result === undefined) {
			// If active execution could not be found check if it is a waiting one
			returnData = await this.waitTracker.stopExecution(execution.id);
		} else {
			returnData = {
				mode: result.mode,
				startedAt: new Date(result.startedAt),
				stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
				finished: result.finished,
				status: result.status,
			};
		}

		return returnData;
	}
}
