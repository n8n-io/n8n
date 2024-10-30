import { Response, NextFunction } from 'express';

import { StatisticsNames } from '@/databases/entities/workflow-statistics';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';
import { WorkflowStatisticsRepository } from '@/databases/repositories/workflow-statistics.repository';
import { Get, Middleware, RestController } from '@/decorators';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { IWorkflowStatisticsDataLoaded, WorkflowStatisticsData } from '@/interfaces';
import { Logger } from '@/logging/logger.service';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

import { StatisticsRequest } from './workflow-statistics.types';

@RestController('/workflow-stats')
export class WorkflowStatisticsController {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowStatisticsRepository: WorkflowStatisticsRepository,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
		private readonly logger: Logger,
	) {}

	/**
	 * Check that the workflow ID is valid and allowed to be read by the user
	 */
	// TODO: move this into a new decorator `@ValidateWorkflowPermission`
	@Middleware()
	async hasWorkflowAccess(req: StatisticsRequest.GetOne, _res: Response, next: NextFunction) {
		const { user } = req;
		const workflowId = req.params.id;

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (workflow) {
			next();
		} else {
			this.logger.warn('User attempted to read a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			// Otherwise, make and return an error
			throw new NotFoundError(`Workflow ${workflowId} does not exist.`);
		}
	}

	@Get('/:id/counts/')
	async getCounts(req: StatisticsRequest.GetOne): Promise<WorkflowStatisticsData<number>> {
		return await this.workflowStatisticsService.getData(req.params.id, 'count', 0);
	}

	@Get('/:id/times/')
	async getTimes(req: StatisticsRequest.GetOne): Promise<WorkflowStatisticsData<Date | null>> {
		return await this.workflowStatisticsService.getData(req.params.id, 'latestEvent', null);
	}

	@Get('/:id/data-loaded/')
	async getDataLoaded(req: StatisticsRequest.GetOne): Promise<IWorkflowStatisticsDataLoaded> {
		// Get flag
		const workflowId = req.params.id;

		// Get the flag
		const stats = await this.workflowStatisticsRepository.findOne({
			select: ['latestEvent'],
			where: {
				workflowId,
				name: StatisticsNames.dataLoaded,
			},
		});

		return {
			dataLoaded: stats ? true : false,
		};
	}
}
