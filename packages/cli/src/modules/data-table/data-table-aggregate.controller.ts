import { ListDataTableQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { DataTableAggregateService } from './data-table-aggregate.service';
import { DataTableService } from './data-table.service';

@RestController('/data-tables-global')
export class DataTableAggregateController {
	constructor(
		private readonly dataStoreAggregateService: DataTableAggregateService,
		private readonly dataStoreService: DataTableService,
	) {}

	@Get('/')
	@GlobalScope('dataStore:list')
	async listDataTables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataTableQueryDto,
	) {
		return await this.dataStoreAggregateService.getManyAndCount(req.user, payload);
	}

	@Get('/limits')
	@GlobalScope('dataStore:list')
	async getDataTablesSize(req: AuthenticatedRequest) {
		return await this.dataStoreService.getDataTablesSize(req.user);
	}
}
