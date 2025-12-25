import { ListDataTableQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { DataTableAggregateService } from './data-table-aggregate.service';
import { DataTableService } from './data-table.service';

@RestController('/data-tables-global')
export class DataTableAggregateController {
	constructor(
		private readonly dataTableAggregateService: DataTableAggregateService,
		private readonly dataTableService: DataTableService,
	) {}

	@Get('/')
	@GlobalScope('dataTable:list')
	async listDataTables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataTableQueryDto,
	) {
		return await this.dataTableAggregateService.getManyAndCount(req.user, payload);
	}

	@Get('/limits')
	@GlobalScope('dataTable:list')
	async getDataTablesSize(req: AuthenticatedRequest) {
		return await this.dataTableService.getDataTablesSize(req.user);
	}
}
