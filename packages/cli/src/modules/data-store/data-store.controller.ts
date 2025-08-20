import {
	AddDataStoreRowsDto,
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DeleteDataStoreRowsQueryDto,
	ListDataStoreContentQueryDto,
	ListDataStoreQueryDto,
	MoveDataStoreColumnDto,
	UpdateDataStoreDto,
	UpdateDataStoreRowDto,
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

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { DataStoreService } from './data-store.service';
import { DataStoreColumnNameConflictError } from './errors/data-store-column-name-conflict.error';
import { DataStoreColumnNotFoundError } from './errors/data-store-column-not-found.error';
import { DataStoreNameConflictError } from './errors/data-store-name-conflict.error';
import { DataStoreNotFoundError } from './errors/data-store-not-found.error';
import { DataStoreValidationError } from './errors/data-store-validation.error';

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
		try {
			return await this.dataStoreService.createDataStore(req.params.projectId, dto);
		} catch (e: unknown) {
			if (!(e instanceof Error)) {
				throw e;
			} else if (e instanceof DataStoreNameConflictError) {
				throw new ConflictError(e.message);
			} else {
				throw new InternalServerError(e.message, e);
			}
		}
	}

	@Get('/')
	@ProjectScope('dataStore:listProject')
	async listProjectDataStores(
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
		try {
			return await this.dataStoreService.updateDataStore(dataStoreId, req.params.projectId, dto);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof DataStoreNameConflictError) {
				throw new ConflictError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Delete('/:dataStoreId')
	@ProjectScope('dataStore:delete')
	async deleteDataStore(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		try {
			return await this.dataStoreService.deleteDataStore(dataStoreId, req.params.projectId);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Get('/:dataStoreId/columns')
	@ProjectScope('dataStore:read')
	async getColumns(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
	) {
		try {
			return await this.dataStoreService.getColumns(dataStoreId, req.params.projectId);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Post('/:dataStoreId/columns')
	@ProjectScope('dataStore:update')
	async addColumn(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: AddDataStoreColumnDto,
	) {
		try {
			return await this.dataStoreService.addColumn(dataStoreId, req.params.projectId, dto);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof DataStoreColumnNameConflictError) {
				throw new ConflictError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Delete('/:dataStoreId/columns/:columnId')
	@ProjectScope('dataStore:update')
	async deleteColumn(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Param('columnId') columnId: string,
	) {
		try {
			return await this.dataStoreService.deleteColumn(dataStoreId, req.params.projectId, columnId);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError || e instanceof DataStoreColumnNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
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
		try {
			return await this.dataStoreService.moveColumn(
				dataStoreId,
				req.params.projectId,
				columnId,
				dto,
			);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError || e instanceof DataStoreColumnNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof DataStoreValidationError) {
				throw new BadRequestError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Get('/:dataStoreId/rows')
	@ProjectScope('dataStore:readRow')
	async getDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Query dto: ListDataStoreContentQueryDto,
	) {
		try {
			return await this.dataStoreService.getManyRowsAndCount(
				dataStoreId,
				req.params.projectId,
				dto,
			);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Post('/:dataStoreId/insert')
	@ProjectScope('dataStore:writeRow')
	async appendDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: AddDataStoreRowsDto,
	) {
		try {
			return await this.dataStoreService.insertRows(dataStoreId, req.params.projectId, dto.data);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof DataStoreValidationError) {
				throw new BadRequestError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Post('/:dataStoreId/upsert')
	@ProjectScope('dataStore:writeRow')
	async upsertDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: UpsertDataStoreRowsDto,
	) {
		try {
			return await this.dataStoreService.upsertRows(dataStoreId, req.params.projectId, dto);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof DataStoreValidationError) {
				throw new BadRequestError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Patch('/:dataStoreId/rows')
	@ProjectScope('dataStore:writeRow')
	async updateDataStoreRow(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Body dto: UpdateDataStoreRowDto,
	) {
		try {
			return await this.dataStoreService.updateRow(dataStoreId, req.params.projectId, dto);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof DataStoreValidationError) {
				throw new BadRequestError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}

	@Delete('/:dataStoreId/rows')
	@ProjectScope('dataStore:writeRow')
	async deleteDataStoreRows(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dataStoreId') dataStoreId: string,
		@Query dto: DeleteDataStoreRowsQueryDto,
	) {
		try {
			const { ids } = dto;
			return await this.dataStoreService.deleteRows(dataStoreId, req.params.projectId, ids);
		} catch (e: unknown) {
			if (e instanceof DataStoreNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof Error) {
				throw new InternalServerError(e.message, e);
			} else {
				throw e;
			}
		}
	}
}
