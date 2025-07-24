import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, RestController } from '@n8n/decorators';

import { DataStoreService } from './data-store.service';
import { CreateDataStoreDto } from '@n8n/api-types';

@RestController('/data-store')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Post('/create', { skipAuth: true })
	async createDataStore(_req: AuthenticatedRequest, _res: Response, @Body dto: CreateDataStoreDto) {
		return await this.dataStoreService.createDataStore(dto);
	}

	@Get('/meta-data/:dataStoreId', { skipAuth: true })
	async getMetaData(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		return await this.dataStoreService.getMetaData(dataStoreId);
	}

	@Get('/meta-data/by-project', { skipAuth: true })
	async getMetaDataByProjectId(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body projectIds: string | string[],
	) {
		return await this.dataStoreService.getMetaDataByProjectIds([projectIds].flat());
	}

	@Get('/meta-data/all', { skipAuth: true })
	async getMetaDataAll(_req: AuthenticatedRequest, _res: Response) {
		return await this.dataStoreService.getMetaDataAll();
	}
}
