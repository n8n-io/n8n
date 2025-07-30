import {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DeleteDataStoreColumnDto,
	ListDataStoreContentQueryDto,
	ListDataStoreQueryDto,
	RenameDataStoreDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, Query, RestController } from '@n8n/decorators';

import { DataStoreService } from './data-store.service';
import { DataStoreRows } from './data-store.types';
@RestController('/data-store')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Post('/create', { skipAuth: true })
	async createDataStore(_req: AuthenticatedRequest, _res: Response, @Body dto: CreateDataStoreDto) {
		return await this.dataStoreService.createDataStore(dto);
	}

	@Get('/', { skipAuth: true })
	async listDataStores(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		const [data, count] = await this.dataStoreService.getManyAndCount(payload);

		return { count, data };
	}

	@Get('/:dataStoreId/get-columns', { skipAuth: true })
	async getColumns(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		return await this.dataStoreService.getColumns(dataStoreId);
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

	@Get('/:dataStoreId/get-rows', { skipAuth: true })
	async getDataStoreRows(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: Partial<ListDataStoreContentQueryDto>,
	) {
		return await this.dataStoreService.getManyRowsAndCount(dataStoreId, dto);
	}

	@Post('/:dataStoreId/append', { skipAuth: true })
	async appendDataStoreRows(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: DataStoreRows,
	) {
		return await this.dataStoreService.appendRows(dataStoreId, dto);
	}
}
