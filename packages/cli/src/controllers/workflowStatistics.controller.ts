import { Service } from 'typedi';
import { Response, NextFunction } from 'express';
import { ILogger } from 'n8n-workflow';
import { Get, Middleware, RestController } from '@/decorators';
import type { WorkflowStatistics } from '@db/entities/WorkflowStatistics';
import { StatisticsNames } from '@db/entities/WorkflowStatistics';
import { SharedWorkflowRepository, WorkflowStatisticsRepository } from '@db/repositories';
import { ExecutionRequest } from '@/requests';
import { whereClause } from '@/UserManagement/UserManagementHelper';
import { NotFoundError } from '@/ResponseHelper';
import type { IWorkflowStatisticsDataLoaded } from '@/Interfaces';

interface WorkflowStatisticsData<T> {
	productionSuccess: T;
	productionError: T;
	manualSuccess: T;
	manualError: T;
}

@Service()
@RestController('/workflow-stats')
export class WorkflowStatisticsController {
	constructor(
		private sharedWorkflowRepository: SharedWorkflowRepository,
		private workflowStatisticsRepository: WorkflowStatisticsRepository,
		private readonly logger: ILogger,
	) {}

	/**
	 * Check that the workflow ID is valid and allowed to be read by the user
	 */
	// TODO: move this into a new decorator `@ValidateWorkflowPermission`
	@Middleware()
	async hasWorkflowAccess(req: ExecutionRequest.Get, res: Response, next: NextFunction) {
		const { user } = req;
		const workflowId = req.params.id;
		const allowed = await this.sharedWorkflowRepository.exist({
			relations: ['workflow'],
			where: whereClause({
				user,
				entityType: 'workflow',
				entityId: workflowId,
			}),
		});

		if (allowed) {
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
	async getCounts(req: ExecutionRequest.Get): Promise<WorkflowStatisticsData<number>> {
		return this.getData(req.params.id, 'count', 0);
	}

	@Get('/:id/times/')
	async getTimes(req: ExecutionRequest.Get): Promise<WorkflowStatisticsData<Date | null>> {
		return this.getData(req.params.id, 'latestEvent', null);
	}

	@Get('/:id/data-loaded/')
	async getDataLoaded(req: ExecutionRequest.Get): Promise<IWorkflowStatisticsDataLoaded> {
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
