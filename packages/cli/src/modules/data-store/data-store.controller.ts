import { AuthenticatedRequest } from '@n8n/db';
import { Body, Post, RestController } from '@n8n/decorators';

import { DataStoreService } from './data-store.service';
import { CreateDataStoreDto } from '@n8n/api-types';

@RestController('/data-store')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Post('/create')
	async createDataStore(_req: AuthenticatedRequest, _res: Response, @Body dto: CreateDataStoreDto) {
		return await this.dataStoreService.createDataStore(dto);
	}
}
