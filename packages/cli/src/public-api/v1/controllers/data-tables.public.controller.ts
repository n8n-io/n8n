import {
	CreateDataTablePublicDto,
	DataTableListPublicDto,
	DataTablePublicDto,
	PublicApiListDataTableQueryDto,
	UpdateDataTablePublicDto,
	dataTableIdParamSchema,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DataTableAggregateService } from '@/modules/data-table/data-table-aggregate.service';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableAccessDeniedError } from '@/modules/data-table/errors/data-table-access-denied.error';
import { DataTableNameConflictError } from '@/modules/data-table/errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { ProjectNotFoundError } from '@/services/project.service.ee';

const tags = ['DataTable'];

/** The domain errors the data table service raises, mapped to the public statuses the eov handler sent. */
function handleError(error: unknown): never {
	if (error instanceof DataTableValidationError) {
		throw new BadRequestError(error.message);
	}
	if (error instanceof ProjectNotFoundError) {
		throw new BadRequestError(`Project with ID "${error.projectId}" not found`);
	}
	if (error instanceof DataTableNotFoundError) {
		throw new NotFoundError(error.message);
	}
	if (error instanceof DataTableAccessDeniedError) {
		throw new ForbiddenError();
	}
	if (error instanceof DataTableNameConflictError) {
		throw new ConflictError(error.message);
	}

	throw error;
}

const toDataTablePublicDto = (dataTable: DataTable, sizeBytes: number): DataTablePublicDto => ({
	id: dataTable.id,
	name: dataTable.name,
	columns: (dataTable.columns ?? []).map((column) => ({
		id: column.id,
		name: column.name,
		type: column.type,
		index: column.index,
	})),
	projectId: dataTable.projectId,
	createdAt: dataTable.createdAt.toISOString(),
	updatedAt: dataTable.updatedAt.toISOString(),
	sizeBytes,
});

@PublicApiController('/data-tables')
export class DataTablesPublicController {
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly dataTableAggregateService: DataTableAggregateService,
	) {}

	@Get('/')
	@ApiKeyScope('dataTable:list')
	@ApiSummary('List all data tables')
	@ApiDescription(
		'Retrieve a list of all data tables with optional filtering, sorting, and pagination. ' +
			'Each table includes `sizeBytes`, the value the `size` sort option orders by.',
	)
	@ApiTags(tags)
	@ApiResponse(200, DataTableListPublicDto)
	async listDataTables(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: PublicApiListDataTableQueryDto,
	): Promise<DataTableListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		try {
			const { data, count } = await this.dataTableAggregateService.getManyAndCount(req.user, {
				skip: offset,
				take: limit,
				filter: query.filter,
				sortBy: query.sortBy,
			});

			const sizes = await this.dataTableService.getCachedSizeBytesByIds(
				data.map((dataTable) => dataTable.id),
			);

			return {
				data: data.map((dataTable) =>
					toDataTablePublicDto(dataTable, sizes.get(dataTable.id) ?? 0),
				),
				nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
			};
		} catch (error) {
			return handleError(error);
		}
	}

	@Post('/')
	@ApiKeyScope('dataTable:create')
	@ApiSummary('Create a new data table')
	@ApiDescription(
		'Create a new data table in your personal project or a team project you have access to.',
	)
	@ApiTags(tags)
	@ApiResponse(201, DataTablePublicDto)
	@ApiErrorResponse(409)
	async createDataTable(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateDataTablePublicDto,
	): Promise<DataTablePublicDto> {
		try {
			const owningProjectId = await this.dataTableService.resolveOwningProjectId(
				req.user,
				body.projectId,
			);

			const dataTable = await this.dataTableService.createDataTable(owningProjectId, {
				name: body.name,
				columns: body.columns,
			});

			return await this.withSize(dataTable);
		} catch (error) {
			return handleError(error);
		}
	}

	@Get('/:dataTableId')
	@ApiKeyScope('dataTable:read')
	@ProjectScope('dataTable:read')
	@ApiSummary('Get a data table')
	@ApiDescription('Retrieve a specific data table by ID.')
	@ApiTags(tags)
	@ApiResponse(200, DataTablePublicDto)
	@ApiErrorResponse(404)
	async getDataTable(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
	): Promise<DataTablePublicDto> {
		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

			return await this.withSize(await this.dataTableService.getOne(dataTableId, projectId));
		} catch (error) {
			return handleError(error);
		}
	}

	@Patch('/:dataTableId')
	@ApiKeyScope('dataTable:update')
	@ProjectScope('dataTable:update')
	@ApiSummary('Update a data table')
	@ApiDescription("Update a data table's name.")
	@ApiTags(tags)
	@ApiResponse(200, DataTablePublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateDataTable(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Body body: UpdateDataTablePublicDto,
	): Promise<DataTablePublicDto> {
		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

			await this.dataTableService.updateDataTable(dataTableId, projectId, { name: body.name });

			return await this.withSize(await this.dataTableService.getOne(dataTableId, projectId));
		} catch (error) {
			return handleError(error);
		}
	}

	@Delete('/:dataTableId')
	@ApiKeyScope('dataTable:delete')
	@ProjectScope('dataTable:delete')
	@ApiSummary('Delete a data table')
	@ApiDescription('Delete a data table. This will also delete all rows in the table.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteDataTable(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
	): Promise<void> {
		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

			await this.dataTableService.deleteDataTable(dataTableId, projectId);
		} catch (error) {
			handleError(error);
		}
	}

	private async withSize(dataTable: DataTable): Promise<DataTablePublicDto> {
		const sizes = await this.dataTableService.getCachedSizeBytesByIds([dataTable.id]);

		return toDataTablePublicDto(dataTable, sizes.get(dataTable.id) ?? 0);
	}
}
