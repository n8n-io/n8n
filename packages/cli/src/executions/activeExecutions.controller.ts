import { jsonParse, type IExecutionsSummary } from 'n8n-workflow';

import config from '@/config';
import { Authorized, Get, Post, RestController } from '@/decorators';
import type { IExecutionsStopData } from '@/Interfaces';
import { ExecutionRequest } from '@/executions/execution.request';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import {
	ActiveExecutionsService,
	type ActiveExecutionsQueryFilter,
} from './activeExecutions.service';

@Authorized()
@RestController('/active-executions')
export class ActiveExecutionsController {
	private readonly isQueueMode = config.getEnv('executions.mode') === 'queue';

	constructor(private readonly activeExecutionsService: ActiveExecutionsService) {}

	@Get('/')
	async getActiveExecutions(req: ExecutionRequest.GetAllCurrent): Promise<IExecutionsSummary[]> {
		const { filter: filterString } = req.query;
		const filter = filterString?.length ? jsonParse<ActiveExecutionsQueryFilter>(filterString) : {};
		if (this.isQueueMode) {
			return this.activeExecutionsService.getQueueModeExecutions(req.user, filter);
		} else {
			return this.activeExecutionsService.getRegularModeExecutions(req.user, filter);
		}
	}

	@Post('/:id/stop')
	async stopExecution(req: ExecutionRequest.Stop): Promise<IExecutionsStopData> {
		const { id: executionId } = req.params;

		const execution = await this.activeExecutionsService.findExecution(req.user, executionId);
		if (!execution) {
			throw new NotFoundError('Execution not found');
		}

		if (config.getEnv('executions.mode') === 'queue') {
			return this.activeExecutionsService.stopQueueModeExecution(execution);
		} else {
			return this.activeExecutionsService.stopRegularModeExecution(execution);
		}
	}
}
