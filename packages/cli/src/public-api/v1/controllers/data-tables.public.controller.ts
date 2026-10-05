import {
	ClearDataTableRowsResponsePublicDto,
	columnIdParamSchema,
	CreateDataTableColumnPublicDto,
	CreateDataTablePublicDto,
	CreateDataTableRowsPublicDto,
	DataTableColumnListPublicDto,
	DataTableColumnPublicDto,
	DataTableListPublicDto,
	DataTablePublicDto,
	DataTableRowListPublicDto,
	DeleteDataTableRowsPublicQueryDto,
	DeleteDataTableRowsResponsePublicDto,
	InsertDataTableRowsResponsePublicDto,
	PublicApiListDataTableQueryDto,
	PublicApiListDataTableRowsQueryDto,
	UpdateDataTableColumnPublicDto,
	UpdateDataTablePublicDto,
	UpdateDataTableRowPublicDto,
	UpdateDataTableRowResponsePublicDto,
	UpsertDataTableRowPublicDto,
	UpsertDataTableRowResponsePublicDto,
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

import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { DataTableRow, DataTableRowReturn, DataTableRowReturnWithState } from 'n8n-workflow';

import { DataTableAggregateService } from '@/modules/data-table/data-table-aggregate.service';
import type { DataTableColumn } from '@/modules/data-table/data-table-column.entity';
import { assertRowReadAccessIfReturningRows } from '@/modules/data-table/data-table-permissions';
import type { DataTable } from '@/modules/data-table/data-table.entity';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableAccessDeniedError } from '@/modules/data-table/errors/data-table-access-denied.error';
import { DataTableColumnNameConflictError } from '@/modules/data-table/errors/data-table-column-name-conflict.error';
import { DataTableNameConflictError } from '@/modules/data-table/errors/data-table-name-conflict.error';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableSystemColumnNameConflictError } from '@/modules/data-table/errors/data-table-system-column-name-conflict.error';
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
	if (
		error instanceof DataTableNameConflictError ||
		error instanceof DataTableColumnNameConflictError ||
		error instanceof DataTableSystemColumnNameConflictError
	) {
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
		createdAt: column.createdAt.toISOString(),
		updatedAt: column.updatedAt.toISOString(),
	})),
	projectId: dataTable.projectId,
	createdAt: dataTable.createdAt.toISOString(),
	updatedAt: dataTable.updatedAt.toISOString(),
	sizeBytes,
});

const toDataTableColumnPublicDto = (column: DataTableColumn): DataTableColumnPublicDto => ({
	id: column.id,
	name: column.name,
	dataTableId: column.dataTableId,
	type: column.type,
	index: column.index,
	createdAt: column.createdAt.toISOString(),
	updatedAt: column.updatedAt.toISOString(),
});

/** User-defined columns can be dates too, so any remaining `Date` values must be ISO strings. */
const normalizeRowDates = (row: DataTableRow) =>
	Object.fromEntries(
		Object.entries(row).map(([key, value]) => [
			key,
			value instanceof Date ? value.toISOString() : value,
		]),
	);

const toDataTableRowPublic = (row: DataTableRowReturn) => {
	const { id, createdAt, updatedAt, ...rest } = row;
	return {
		...normalizeRowDates(rest),
		id,
		createdAt: createdAt.toISOString(),
		updatedAt: updatedAt.toISOString(),
	};
};

const toDataTableRowWithStatePublic = (row: DataTableRowReturnWithState) => {
	const { id, createdAt, updatedAt, dryRunState, ...rest } = row;
	return {
		...normalizeRowDates(rest),
		id,
		createdAt: createdAt?.toISOString() ?? null,
		updatedAt: updatedAt?.toISOString() ?? null,
		dryRunState,
	};
};

const isRowWithId = (row: object): row is Pick<DataTableRowReturn, 'id'> => !('createdAt' in row);

const isRowWithState = (
	row: DataTableRowReturn | DataTableRowReturnWithState,
): row is DataTableRowReturnWithState => Object.hasOwn(row, 'dryRunState');

const toMutateRowsResponsePublic = (
	result: boolean | DataTableRowReturn[] | DataTableRowReturnWithState[],
) =>
	typeof result === 'boolean'
		? result
		: result.map((row) =>
				isRowWithState(row) ? toDataTableRowWithStatePublic(row) : toDataTableRowPublic(row),
			);

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
				fileId: body.fileId,
				hasHeaders: body.hasHeaders,
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

	@Get('/:dataTableId/columns')
	@ApiKeyScope('dataTableColumn:read')
	@ProjectScope('dataTable:readColumn')
	@ApiSummary('List columns of a data table')
	@ApiDescription('Retrieve all columns for a specific data table.')
	@ApiTags(tags)
	@ApiResponse(200, DataTableColumnListPublicDto)
	@ApiErrorResponse(404)
	async listDataTableColumns(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
	): Promise<DataTableColumnListPublicDto> {
		const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
		const columns = await this.dataTableService.getColumns(dataTableId, projectId);

		return columns.map(toDataTableColumnPublicDto);
	}

	@Post('/:dataTableId/columns')
	@ApiKeyScope('dataTableColumn:create')
	@ProjectScope('dataTable:writeColumn')
	@ApiSummary('Add a column to a data table')
	@ApiDescription('Add a new column to an existing data table.')
	@ApiTags(tags)
	@ApiResponse(201, DataTableColumnPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async createDataTableColumn(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Body body: CreateDataTableColumnPublicDto,
	): Promise<DataTableColumnPublicDto> {
		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
			const column = await this.dataTableService.addColumn(dataTableId, projectId, body);

			return toDataTableColumnPublicDto(column);
		} catch (error) {
			return handleError(error);
		}
	}

	@Patch('/:dataTableId/columns/:columnId')
	@ApiKeyScope('dataTableColumn:update')
	@ProjectScope('dataTable:writeColumn')
	@ApiSummary('Update a column')
	@ApiDescription('Rename and/or reorder a column in a data table.')
	@ApiTags(tags)
	@ApiResponse(200, DataTableColumnPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateDataTableColumn(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Param('columnId', columnIdParamSchema) columnId: string,
		@Body({ required: true }) body: UpdateDataTableColumnPublicDto,
	): Promise<DataTableColumnPublicDto> {
		const { name, index } = body;

		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

			if (name !== undefined) {
				await this.dataTableService.renameColumn(dataTableId, projectId, columnId, { name });
			}
			if (index !== undefined) {
				await this.dataTableService.moveColumn(dataTableId, projectId, columnId, {
					targetIndex: index,
				});
			}

			const column = await this.dataTableService.getColumnById({
				projectId,
				dataTableId,
				columnId,
			});

			return toDataTableColumnPublicDto(column);
		} catch (error) {
			return handleError(error);
		}
	}

	@Delete('/:dataTableId/columns/:columnId')
	@ApiKeyScope('dataTableColumn:delete')
	@ProjectScope('dataTable:writeColumn')
	@ApiSummary('Delete a column')
	@ApiDescription(
		'Remove a column from a data table. This will also delete all data in the column.',
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteDataTableColumn(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Param('columnId', columnIdParamSchema) columnId: string,
	): Promise<void> {
		const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

		await this.dataTableService.deleteColumn(dataTableId, projectId, columnId);
	}

	@Get('/:dataTableId/rows')
	@ApiKeyScope('dataTableRow:read')
	@ProjectScope('dataTable:readRow')
	@ApiSummary('List rows of a data table')
	@ApiDescription(
		'Retrieve rows from a data table with optional filtering, sorting, and pagination.',
	)
	@ApiTags(tags)
	@ApiResponse(200, DataTableRowListPublicDto)
	@ApiErrorResponse(404)
	async listDataTableRows(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Query query: PublicApiListDataTableRowsQueryDto,
	): Promise<DataTableRowListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
			const { data, count } = await this.dataTableService.getManyRowsAndCount(
				dataTableId,
				projectId,
				{
					skip: offset,
					take: limit,
					filter: query.filter,
					sortBy: query.sortBy,
					search: query.search,
				},
			);

			return {
				data: data.map(toDataTableRowPublic),
				nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
			};
		} catch (error) {
			return handleError(error);
		}
	}

	@Post('/:dataTableId/rows')
	@ApiKeyScope('dataTableRow:create')
	@ProjectScope('dataTable:writeRow')
	@ApiSummary('Insert rows into a data table')
	@ApiDescription('Insert one or more rows into a data table.')
	@ApiTags(tags)
	@ApiResponse(200, InsertDataTableRowsResponsePublicDto)
	@ApiErrorResponse(404)
	async createDataTableRows(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Body body: CreateDataTableRowsPublicDto,
	) {
		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
			const result = await this.dataTableService.insertRows(
				dataTableId,
				projectId,
				body.data,
				body.returnType,
			);

			return Array.isArray(result)
				? result.map((row) => (isRowWithId(row) ? row : toDataTableRowPublic(row)))
				: result;
		} catch (error) {
			return handleError(error);
		}
	}

	@Post('/:dataTableId/rows/upsert')
	@ApiKeyScope('dataTableRow:upsert')
	@ProjectScope('dataTable:writeRow')
	@ApiSummary('Upsert a row in a data table')
	@ApiDescription(
		'Update an existing row, or insert a new one if no row matches the filter conditions.',
	)
	@ApiTags(tags)
	@ApiResponse(200, UpsertDataTableRowResponsePublicDto)
	@ApiErrorResponse(404)
	async upsertDataTableRow(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Body body: UpsertDataTableRowPublicDto,
	) {
		const { filter, data, returnData, dryRun } = body;

		try {
			await assertRowReadAccessIfReturningRows(req.user, dataTableId, { dryRun, returnData });

			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
			const result = await this.dataTableService.upsertRow(
				dataTableId,
				projectId,
				{ filter, data },
				returnData,
				dryRun,
			);

			return toMutateRowsResponsePublic(result);
		} catch (error) {
			return handleError(error);
		}
	}

	@Patch('/:dataTableId/rows/update')
	@ApiKeyScope('dataTableRow:update')
	@ProjectScope('dataTable:writeRow')
	@ApiSummary('Update rows in a data table')
	@ApiDescription('Update rows matching filter conditions in a data table.')
	@ApiTags(tags)
	@ApiResponse(200, UpdateDataTableRowResponsePublicDto)
	@ApiErrorResponse(404)
	async updateDataTableRows(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Body body: UpdateDataTableRowPublicDto,
	) {
		const { filter, data, returnData, dryRun } = body;

		try {
			await assertRowReadAccessIfReturningRows(req.user, dataTableId, { dryRun, returnData });

			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
			const result = await this.dataTableService.updateRows(
				dataTableId,
				projectId,
				{ filter, data },
				returnData,
				dryRun,
			);

			return toMutateRowsResponsePublic(result);
		} catch (error) {
			return handleError(error);
		}
	}

	@Delete('/:dataTableId/rows/clear')
	@ApiKeyScope('dataTableRow:delete')
	@ProjectScope('dataTable:writeRow')
	@ApiSummary('Clear all rows from a data table')
	@ApiDescription(
		'Permanently delete all rows from a data table. The table structure is retained. This ' +
			'action cannot be undone.',
	)
	@ApiTags(tags)
	@ApiResponse(200, ClearDataTableRowsResponsePublicDto)
	@ApiErrorResponse(404)
	async clearDataTableRows(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
	): Promise<ClearDataTableRowsResponsePublicDto> {
		try {
			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

			return await this.dataTableService.clearRows(dataTableId, projectId);
		} catch (error) {
			return handleError(error);
		}
	}

	@Delete('/:dataTableId/rows/delete')
	@ApiKeyScope('dataTableRow:delete')
	@ProjectScope('dataTable:writeRow')
	@ApiSummary('Delete rows from a data table')
	@ApiDescription(
		'Delete rows matching filter conditions from a data table. Filter is required to prevent ' +
			'accidental deletion of all data.',
	)
	@ApiTags(tags)
	@ApiResponse(200, DeleteDataTableRowsResponsePublicDto)
	@ApiErrorResponse(404)
	async deleteDataTableRows(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('dataTableId', dataTableIdParamSchema) dataTableId: string,
		@Query query: DeleteDataTableRowsPublicQueryDto,
	) {
		const { filter, returnData, dryRun } = query;

		try {
			await assertRowReadAccessIfReturningRows(req.user, dataTableId, { dryRun, returnData });

			const projectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);
			const result = await this.dataTableService.deleteRows(
				dataTableId,
				projectId,
				{ filter },
				returnData,
				dryRun,
			);

			return toMutateRowsResponsePublic(result);
		} catch (error) {
			return handleError(error);
		}
	}

	private async withSize(dataTable: DataTable): Promise<DataTablePublicDto> {
		const sizes = await this.dataTableService.getCachedSizeBytesByIds([dataTable.id]);

		return toDataTablePublicDto(dataTable, sizes.get(dataTable.id) ?? 0);
	}
}
