import { ListDataStoreQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { DataStoreAggregateService } from './data-store-aggregate.service';

@RestController('/data-stores-global')
export class DataStoreAggregateController {
	constructor(private readonly dataStoreAggregateService: DataStoreAggregateService) {}

	@Get('/')
	@GlobalScope('dataStore:list')
	async listDataStores(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		return await this.dataStoreAggregateService.getManyAndCount(req.user, payload);
	}
}
