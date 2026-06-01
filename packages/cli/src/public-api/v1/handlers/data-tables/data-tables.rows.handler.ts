import {
	PublicApiListDataTableContentQueryDto,
	AddDataTableRowsDto,
	UpdateDataTableRowDto,
	UpsertDataTableRowDto,
	DeleteDataTableRowsDto,
} from '@n8n/api-types';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

import type { DataTableRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	publicApiScope,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

const handleError = (error: unknown) => {
	if (error instanceof DataTableNotFoundError) {
		throw new NotFoundError(error.message);
	}
	if (error instanceof DataTableValidationError) {
		throw new BadRequestError(error.message);
	}

	throw error;
};

/**
 * Convert all query parameter values to strings for DTO validation.
 * Express/Supertest may parse some values as numbers/booleans.
 */
const stringifyQuery = (query: Record<string, unknown>): Record<string, string | undefined> => {
	const result: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) {
			result[key] = String(value);
		}
	}
	return result;
};

type DataTableRowsHandlers = {
	getDataTableRows: PublicAPIEndpoint<DataTableRequest.GetRows>;
	insertDataTableRows: PublicAPIEndpoint<DataTableRequest.InsertRows>;
	updateDataTableRows: PublicAPIEndpoint<DataTableRequest.UpdateRows>;
	upsertDataTableRow: PublicAPIEndpoint<DataTableRequest.UpsertRow>;
	deleteDataTableRows: PublicAPIEndpoint<DataTableRequest.DeleteRows>;
};

const dataTableRowsHandlers: DataTableRowsHandlers = {
	getDataTableRows: [
		publicApiScope('dataTableRow:read'),
		projectScope('dataTable:readRow', 'dataTable'),
		validCursor,
		async (req, res) => {
			try {
				const { dataTableId } = req.params;

				const payload = PublicApiListDataTableContentQueryDto.safeParse(stringifyQuery(req.query));
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors[0]?.message || 'Invalid query parameters');
				}

				const { offset, limit, filter, sortBy, search } = payload.data;

				const projectId =
					await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);

				const result = await Container.get(DataTableService).getManyRowsAndCount(
					dataTableId,
					projectId,
					{
						skip: offset,
						take: limit,
						filter,
						sortBy,
						search,
					},
				);

				return res.json({
					data: result.data,
					nextCursor: encodeNextCursor({
						offset,
						limit,
						numberOfTotalRecords: result.count,
					}),
				});
			} catch (error) {
				return handleError(error);
			}
		},
	],

	insertDataTableRows: [
		publicApiScope('dataTableRow:create'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req, res) => {
			try {
				const { dataTableId } = req.params;

				const payload = AddDataTableRowsDto.safeParse(req.body);
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors[0]?.message || 'Invalid request body');
				}

				const projectId =
					await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);

				const result = await Container.get(DataTableService).insertRows(
					dataTableId,
					projectId,
					payload.data.data,
					payload.data.returnType,
				);

				return res.json(result);
			} catch (error) {
				return handleError(error);
			}
		},
	],

	updateDataTableRows: [
		publicApiScope('dataTableRow:update'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req, res) => {
			try {
				const { dataTableId } = req.params;

				const payload = UpdateDataTableRowDto.safeParse(req.body);
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors[0]?.message || 'Invalid request body');
				}

				const projectId =
					await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);
				const service = Container.get(DataTableService);
				const { filter, data, returnData = false, dryRun = false } = payload.data;
				const params = { filter, data };

				const result = dryRun
					? await service.updateRows(dataTableId, projectId, params, returnData, true)
					: returnData
						? await service.updateRows(dataTableId, projectId, params, true, false)
						: await service.updateRows(dataTableId, projectId, params, false, false);

				return res.json(result);
			} catch (error) {
				return handleError(error);
			}
		},
	],

	upsertDataTableRow: [
		publicApiScope('dataTableRow:upsert'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req, res) => {
			try {
				const { dataTableId } = req.params;

				const payload = UpsertDataTableRowDto.safeParse(req.body);
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors[0]?.message || 'Invalid request body');
				}

				const projectId =
					await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);
				const service = Container.get(DataTableService);
				const { filter, data, returnData = false, dryRun = false } = payload.data;
				const params = { filter, data };

				const result = dryRun
					? await service.upsertRow(dataTableId, projectId, params, returnData, true)
					: returnData
						? await service.upsertRow(dataTableId, projectId, params, true, false)
						: await service.upsertRow(dataTableId, projectId, params, false, false);

				return res.json(result);
			} catch (error) {
				return handleError(error);
			}
		},
	],

	deleteDataTableRows: [
		publicApiScope('dataTableRow:delete'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req, res) => {
			try {
				const { dataTableId } = req.params;

				const payload = DeleteDataTableRowsDto.safeParse(stringifyQuery(req.query));
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors[0]?.message || 'Invalid query parameters');
				}

				const projectId =
					await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);
				const service = Container.get(DataTableService);
				const { filter, returnData = false, dryRun = false } = payload.data;
				const params = { filter };

				const result = dryRun
					? await service.deleteRows(dataTableId, projectId, params, returnData, true)
					: returnData
						? await service.deleteRows(dataTableId, projectId, params, true, false)
						: await service.deleteRows(dataTableId, projectId, params, false, false);

				return res.json(result);
			} catch (error) {
				return handleError(error);
			}
		},
	],
};

export = dataTableRowsHandlers;
