/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExecutionRequest } from './execution.request';
import { ExecutionService } from './execution.service';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { EnterpriseExecutionsService } from './execution.service.ee';
import { isSharingEnabled } from '@/UserManagement/UserManagementHelper';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';
import type { User } from '@/databases/entities/User';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import config from '@/config';
import { Queue } from '@/Queue';
import { In, Not, type FindManyOptions, type FindOptionsWhere } from 'typeorm';
import type { ExecutionEntity } from '@/databases/entities/ExecutionEntity';
import { ActiveExecutions } from '@/ActiveExecutions';
import type { ExecutionStatus, IExecutionsSummary } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';
import { getStatusUsingPreviousExecutionStatusMethod } from './executionHelpers';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WaitTracker } from '@/WaitTracker';
import type { IExecutionsStopData } from '@/Interfaces';
import { Logger } from '@/Logger';

@Authorized()
@RestController('/executions')
export class ExecutionsController {
	constructor(
		private readonly executionService: ExecutionService,
		private readonly enterpriseExecutionService: EnterpriseExecutionsService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly executionRepository: ExecutionRepository,
		private readonly queue: Queue,
		private readonly activeExecutions: ActiveExecutions,
		private readonly waitTracker: WaitTracker,
		private readonly logger: Logger,
	) {}

	private async getAccessibleWorkflowIds(user: User) {
		return isSharingEnabled()
			? await this.workflowSharingService.getSharedWorkflowIds(user)
			: await this.workflowSharingService.getSharedWorkflowIds(user, ['owner']);
	}

	@Get('/')
	async getExecutionsList(req: ExecutionRequest.GetAll) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return await this.executionService.getExecutionsList(req, workflowIds);
	}

	@Get('/:id')
	async getExecution(req: ExecutionRequest.Get) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return isSharingEnabled()
			? await this.enterpriseExecutionService.getExecution(req, workflowIds)
			: await this.executionService.getExecution(req, workflowIds);
	}

	@Post('/:id/retry')
	async retryExecution(req: ExecutionRequest.Retry) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return await this.executionService.retryExecution(req, workflowIds);
	}

	@Post('/delete')
	async deleteExecutions(req: ExecutionRequest.Delete) {
		const workflowIds = await this.getAccessibleWorkflowIds(req.user);

		return await this.executionService.deleteExecutions(req, workflowIds);
	}

	@Get('/current')
	async getCurrentExecutions(req: ExecutionRequest.GetAllCurrent) {
		if (config.getEnv('executions.mode') === 'queue') {
			const currentJobs = await this.queue.getJobs(['active', 'waiting']);

			const currentlyRunningQueueIds = currentJobs.map((job) => job.data.executionId);

			const currentlyRunningManualExecutions = this.activeExecutions.getActiveExecutions();
			const manualExecutionIds = currentlyRunningManualExecutions.map((execution) => execution.id);

			const currentlyRunningExecutionIds = currentlyRunningQueueIds.concat(manualExecutionIds);

			if (!currentlyRunningExecutionIds.length) return [];

			const findOptions: FindManyOptions<ExecutionEntity> & {
				where: FindOptionsWhere<ExecutionEntity>;
			} = {
				select: ['id', 'workflowId', 'mode', 'retryOf', 'startedAt', 'stoppedAt', 'status'],
				order: { id: 'DESC' },
				where: {
					id: In(currentlyRunningExecutionIds),
					status: Not(In(['finished', 'stopped', 'failed', 'crashed'] as ExecutionStatus[])),
				},
			};

			const sharedWorkflowIds = await Container.get(WorkflowSharingService).getSharedWorkflowIds(
				req.user,
			);

			if (!sharedWorkflowIds.length) return [];

			if (req.query.filter) {
				const { workflowId, status, finished } = jsonParse<any>(req.query.filter);
				if (workflowId && sharedWorkflowIds.includes(workflowId)) {
					Object.assign(findOptions.where, { workflowId });
				} else {
					Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
				}
				if (status) {
					Object.assign(findOptions.where, { status: In(status) });
				}
				if (finished) {
					Object.assign(findOptions.where, { finished });
				}
			} else {
				Object.assign(findOptions.where, { workflowId: In(sharedWorkflowIds) });
			}

			const executions = await this.executionRepository.findMultipleExecutions(findOptions);

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

		const executingWorkflows = this.activeExecutions.getActiveExecutions();

		const returnData: IExecutionsSummary[] = [];

		const filter = req.query.filter ? jsonParse<any>(req.query.filter) : {};

		const sharedWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(req.user);

		for (const data of executingWorkflows) {
			if (
				(filter.workflowId !== undefined && filter.workflowId !== data.workflowId) ||
				(data.workflowId !== undefined && !sharedWorkflowIds.includes(data.workflowId))
			) {
				continue;
			}

			returnData.push({
				id: data.id,
				workflowId: data.workflowId === undefined ? '' : data.workflowId,
				mode: data.mode,
				retryOf: data.retryOf,
				startedAt: new Date(data.startedAt),
				status: data.status,
			});
		}

		returnData.sort((a, b) => Number(b.id) - Number(a.id));

		return returnData;
	}

	@Post('/current/:id/stop')
	async stopExecution(req: ExecutionRequest.Stop) {
		const { id: executionId } = req.params;

		const sharedWorkflowIds = await Container.get(WorkflowSharingService).getSharedWorkflowIds(
			req.user,
		);

		if (!sharedWorkflowIds.length) {
			throw new NotFoundError('Execution not found');
		}

		const fullExecutionData = await Container.get(ExecutionRepository).findSingleExecution(
			executionId,
			{
				where: {
					workflowId: In(sharedWorkflowIds),
				},
			},
		);

		if (!fullExecutionData) {
			throw new NotFoundError('Execution not found');
		}

		if (config.getEnv('executions.mode') === 'queue') {
			// Manual executions should still be stoppable, so
			// try notifying the `activeExecutions` to stop it.
			const result = await this.activeExecutions.stopExecution(req.params.id);

			if (result === undefined) {
				// If active execution could not be found check if it is a waiting one
				try {
					return await this.waitTracker.stopExecution(req.params.id);
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
				} as IExecutionsStopData;
			}

			const queue = Container.get(Queue);
			const currentJobs = await queue.getJobs(['active', 'waiting']);

			const job = currentJobs.find((job) => job.data.executionId === req.params.id);

			if (!job) {
				this.logger.debug('Could not stop job because it is no longer in queue', {
					jobId: req.params.id,
				});
			} else {
				await queue.stopJob(job);
			}

			const returnData: IExecutionsStopData = {
				mode: fullExecutionData.mode,
				startedAt: new Date(fullExecutionData.startedAt),
				stoppedAt: fullExecutionData.stoppedAt ? new Date(fullExecutionData.stoppedAt) : undefined,
				finished: fullExecutionData.finished,
				status: fullExecutionData.status,
			};

			return returnData;
		}

		// Stop the execution and wait till it is done and we got the data
		const result = await this.activeExecutions.stopExecution(executionId);

		let returnData: IExecutionsStopData;
		if (result === undefined) {
			// If active execution could not be found check if it is a waiting one
			returnData = await this.waitTracker.stopExecution(executionId);
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
