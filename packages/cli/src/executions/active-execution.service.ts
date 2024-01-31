import { Service } from 'typedi';
import { ActiveExecutions } from '@/ActiveExecutions';
import { Logger } from '@/Logger';
import { Queue } from '@/Queue';
import { WaitTracker } from '@/WaitTracker';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { getStatusUsingPreviousExecutionStatusMethod } from '@/executions/executionHelpers';
import config from '@/config';

import type { ExecutionSummary } from 'n8n-workflow';
import type { IExecutionBase, IExecutionsCurrentSummary } from '@/Interfaces';
import type { GetManyActiveFilter } from './execution.types';

@Service()
export class ActiveExecutionService {
	constructor(
		private readonly logger: Logger,
		private readonly queue: Queue,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionRepository: ExecutionRepository,
		private readonly waitTracker: WaitTracker,
	) {}

	private readonly isRegularMode = config.getEnv('executions.mode') === 'regular';

	async findOne(executionId: string, accessibleWorkflowIds: string[]) {
		return await this.executionRepository.findIfAccessible(executionId, accessibleWorkflowIds);
	}

	private toSummary(execution: IExecutionsCurrentSummary | IExecutionBase): ExecutionSummary {
		return {
			id: execution.id,
			workflowId: execution.workflowId ?? '',
			mode: execution.mode,
			retryOf: execution.retryOf !== null ? execution.retryOf : undefined,
			startedAt: new Date(execution.startedAt),
			status: execution.status,
			stoppedAt: 'stoppedAt' in execution ? execution.stoppedAt : undefined,
		};
	}

	// ----------------------------------
	//           regular mode
	// ----------------------------------

	async findManyInRegularMode(
		filter: GetManyActiveFilter,
		accessibleWorkflowIds: string[],
	): Promise<ExecutionSummary[]> {
		return this.activeExecutions
			.getActiveExecutions()
			.filter(({ workflowId }) => {
				if (filter.workflowId && filter.workflowId !== workflowId) return false;
				if (workflowId && !accessibleWorkflowIds.includes(workflowId)) return false;
				return true;
			})
			.map((execution) => this.toSummary(execution))
			.sort((a, b) => Number(b.id) - Number(a.id));
	}

	// ----------------------------------
	//           queue mode
	// ----------------------------------

	async findManyInQueueMode(filter: GetManyActiveFilter, accessibleWorkflowIds: string[]) {
		const activeManualExecutionIds = this.activeExecutions
			.getActiveExecutions()
			.map((execution) => execution.id);

		const activeJobs = await this.queue.getJobs(['active', 'waiting']);

		const activeProductionExecutionIds = activeJobs.map((job) => job.data.executionId);

		const activeExecutionIds = activeProductionExecutionIds.concat(activeManualExecutionIds);

		if (activeExecutionIds.length === 0) return [];

		const activeExecutions = await this.executionRepository.getManyActive(
			activeExecutionIds,
			accessibleWorkflowIds,
			filter,
		);

		return activeExecutions.map((execution) => {
			if (!execution.status) {
				// @tech-debt Status should never be nullish
				execution.status = getStatusUsingPreviousExecutionStatusMethod(execution);
			}

			return this.toSummary(execution);
		});
	}

	async stop(execution: IExecutionBase) {
		const result = await this.activeExecutions.stopExecution(execution.id);

		if (result) {
			return {
				mode: result.mode,
				startedAt: new Date(result.startedAt),
				stoppedAt: result.stoppedAt ? new Date(result.stoppedAt) : undefined,
				finished: result.finished,
				status: result.status,
			};
		}

		if (this.isRegularMode) return await this.waitTracker.stopExecution(execution.id);

		// queue mode

		try {
			return await this.waitTracker.stopExecution(execution.id);
		} catch {}

		const activeJobs = await this.queue.getJobs(['active', 'waiting']);
		const job = activeJobs.find(({ data }) => data.executionId === execution.id);

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
}
