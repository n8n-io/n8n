import { Response, NextFunction } from 'express';
import { Get, Middleware, RestController } from '@/decorators';
import type { WorkflowStatistics } from '@db/entities/WorkflowStatistics';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowStatisticsRepository } from '@db/repositories/workflowStatistics.repository';
import type { IWorkflowStatisticsDataLoaded } from '@/Interfaces';
import { Logger } from '@/Logger';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { StatisticsRequest } from './workflow-statistics.types';

interface WorkflowStatisticsData<T> {
	productionSuccess: T;
	productionError: T;
	manualSuccess: T;
	manualError: T;
}

@RestController('/workflow-stats')
export class WorkflowStatisticsController {
	constructor(
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowStatisticsRepository: WorkflowStatisticsRepository,
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
			this.logger.verbose('User attempted to read a workflow without permissions', {
				workflowId,
				userId: user.id,
			});
			// Otherwise, make and return an error
			throw new NotFoundError(`Workflow ${workflowId} does not exist.`);
		}
	}

	@Get('/:id/counts/')
	async getCounts(req: StatisticsRequest.GetOne): Promise<WorkflowStatisticsData<number>> {
		return await this.getData(req.params.id, 'count', 0);
	}

	@Get('/:id/times/')
	async getTimes(req: StatisticsRequest.GetOne): Promise<WorkflowStatisticsData<Date | null>> {
		return await this.getData(req.params.id, 'latestEvent', null);
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

	private async getData<
		C extends 'count' | 'latestEvent',
		D = WorkflowStatistics[C] extends number ? 0 : null,
	>(workflowId: string, columnName: C, defaultValue: WorkflowStatistics[C] | D) {
		const stats = await this.workflowStatisticsRepository.find({
			select: [columnName, 'name'],
			where: { workflowId },
		});

		const data: WorkflowStatisticsData<WorkflowStatistics[C] | D> = {
			productionSuccess: defaultValue,
			productionError: defaultValue,
			manualSuccess: defaultValue,
			manualError: defaultValue,
		};

		stats.forEach(({ name, [columnName]: value }) => {
			switch (name) {
				case StatisticsNames.manualError:
					data.manualError = value;
					break;

				case StatisticsNames.manualSuccess:
					data.manualSuccess = value;
					break;

				case StatisticsNames.productionError:
					data.productionError = value;
					break;

				case StatisticsNames.productionSuccess:
					data.productionSuccess = value;
			}
		});

		return data;
	}
}
