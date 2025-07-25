import {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DeleteDataStoreColumnDto,
	ListDataStoreQueryDto,
	RenameDataStoreDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, ProjectScope, Query, RestController } from '@n8n/decorators';

import { DataStoreService } from './data-store.service';
@RestController('/data-store')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Post('/create', { skipAuth: true })
	async createDataStore(_req: AuthenticatedRequest, _res: Response, @Body dto: CreateDataStoreDto) {
		return await this.dataStoreService.createDataStore(dto);
	}

	@Get('/', { skipAuth: true })
	@ProjectScope('dataStore:list')
	async listDataStores(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		const [data, count] = await this.dataStoreService.getManyAndCount(payload);

		return { count, data };
	}

	@Post('/:dataStoreId/add-column', { skipAuth: true })
	async addColumn(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: AddDataStoreColumnDto,
	) {
		return await this.dataStoreService.addColumn(dataStoreId, dto);
	}

	@Post('/:dataStoreId/delete-column', { skipAuth: true })
	async deleteColumn(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: DeleteDataStoreColumnDto,
	) {
		return await this.dataStoreService.deleteColumn(dataStoreId, dto);
	}

	@Post('/:dataStoreId/rename', { skipAuth: true })
	async renameDataStore(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: RenameDataStoreDto,
	) {
		return await this.dataStoreService.renameDataStore(dataStoreId, dto);
	}

	@Post('/:dataStoreId/delete', { skipAuth: true })
	async deleteDataStore(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		return await this.dataStoreService.deleteDataStore(dataStoreId);
	}

	@Get('/:dataStoreId', { skipAuth: true })
	async getDataStoreContent(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {}
}
