import { ListDashboardsQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { DashboardAggregateService } from './dashboard-aggregate.service';

@RestController('/dashboards-global')
export class DashboardAggregateController {
	constructor(private readonly dashboardAggregateService: DashboardAggregateService) {}

	@Get('/')
	@GlobalScope('dashboard:list')
	async listDashboards(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDashboardsQueryDto,
	) {
		return await this.dashboardAggregateService.getManyAndCount(req.user, payload);
	}
}
