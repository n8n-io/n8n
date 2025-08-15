import {
	AddDataStoreRowsDto,
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	ListDataStoreContentQueryDto,
	ListDataStoreQueryDto,
	MoveDataStoreColumnDto,
	UpdateDataStoreDto,
	UpsertDataStoreRowsDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';

import { DataStoreService } from './data-store.service';

@RestController('/projects/:projectId/data-stores')
export class DataStoreController {
	constructor(private readonly dataStoreService: DataStoreService) {}

	@Post('/')
	@ProjectScope('dataStore:create')
	async createDataStore(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: CreateDataStoreDto,
	) {
		return await this.dataStoreService.createDataStore(req.params.projectId, dto);
	}

	@Get('/')
	@ProjectScope('dataStore:list')
	async listDataStores(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Query payload: ListDataStoreQueryDto,
	) {
		const providedFilter = payload?.filter ?? {};
		return await this.dataStoreService.getManyAndCount({
			...payload,
			filter: { ...providedFilter, projectId: req.params.projectId },
		});
	}

	@Patch('/:dataStoreId')
	@ProjectScope('dataStore:update')
	async updateDataStore(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: UpdateDataStoreDto,
	) {
		return await this.dataStoreService.updateDataStore(dataStoreId, req.params.projectId, dto);
	}

	@Delete('/:dataStoreId')
	@ProjectScope('dataStore:delete')
	async deleteDataStore(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		return await this.dataStoreService.deleteDataStore(dataStoreId, req.params.projectId);
	}

	@Get('/:dataStoreId/columns')
	@ProjectScope('dataStore:read')
	async getColumns(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		return await this.dataStoreService.getColumns(dataStoreId, req.params.projectId);
	}

	@Post('/:dataStoreId/columns')
	@ProjectScope('dataStore:update')
	async addColumn(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: AddDataStoreColumnDto,
	) {
		return await this.dataStoreService.addColumn(dataStoreId, req.params.projectId, dto);
	}

	@Delete('/:dataStoreId/columns/:columnId')
	@ProjectScope('dataStore:update')
	async deleteColumn(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Param('columnId') columnId: string,
	) {
		return await this.dataStoreService.deleteColumn(dataStoreId, req.params.projectId, columnId);
	}

	@Patch('/:dataStoreId/columns/:columnId/move')
	@ProjectScope('dataStore:update')
	async moveColumn(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Param('columnId') columnId: string,
		@Body dto: MoveDataStoreColumnDto,
	) {
		return await this.dataStoreService.moveColumn(dataStoreId, req.params.projectId, columnId, dto);
	}

	@Get('/:dataStoreId/rows')
	@ProjectScope('dataStore:readRow')
	async getDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Query dto: ListDataStoreContentQueryDto,
	) {
		return await this.dataStoreService.getManyRowsAndCount(dataStoreId, req.params.projectId, dto);
	}

	@Post('/:dataStoreId/insert')
	@ProjectScope('dataStore:writeRow')
	async appendDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: AddDataStoreRowsDto,
	) {
		return await this.dataStoreService.insertRows(dataStoreId, req.params.projectId, dto.data);
	}

	@Post('/:dataStoreId/upsert')
	@ProjectScope('dataStore:writeRow')
	async upsertDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: UpsertDataStoreRowsDto,
	) {
		return await this.dataStoreService.upsertRows(dataStoreId, req.params.projectId, dto);
	}
}
