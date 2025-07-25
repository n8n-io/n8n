import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, Query, RestController } from '@n8n/decorators';

import { DataStoreService } from './data-store.service';
import { CreateDataStoreDto, ListDataStoreQueryDto } from '@n8n/api-types';
import { DataStoreEntity } from './data-store.entity';

@RestController('/data-store')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Post('/create', { skipAuth: true })
	async createDataStore(_req: AuthenticatedRequest, _res: Response, @Body dto: CreateDataStoreDto) {
		return await this.dataStoreService.createDataStore(dto);
	}

	@Get('/')
	@ProjectScope('dataStore:list')
	async listDataStores(
		req: AuthenticatedRequest,
		res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		const [data, count] = await this.dataStoreService.getManyAndCount(payload);

		return { count, data };
	}
}
