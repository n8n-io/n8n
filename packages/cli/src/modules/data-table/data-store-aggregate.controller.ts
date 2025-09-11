import { ListDataStoreQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { DataStoreAggregateService } from './data-store-aggregate.service';
import { DataStoreService } from './data-store.service';

@RestController('/data-tables-global')
export class DataStoreAggregateController {
	constructor(
		private readonly dataStoreAggregateService: DataStoreAggregateService,
		private readonly dataStoreService: DataStoreService,
	) {}

	@Get('/')
	@GlobalScope('dataStore:list')
	async listDataStores(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		return await this.dataStoreAggregateService.getManyAndCount(req.user, payload);
	}

	@Get('/limits')
	@GlobalScope('dataStore:list')
	async getDataTablesSize() {
		return await this.dataStoreService.getDataTablesSize();
	}
}
