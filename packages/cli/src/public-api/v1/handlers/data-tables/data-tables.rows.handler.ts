import { UpdateDataTableRowDto, DeleteDataTableRowsDto } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { BadRequestError, NotFoundError } from '@n8n/errors';
import { assertRowReadAccessIfReturningRows } from '@/modules/data-table/data-table-permissions';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

import type { DataTableRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { publicApiScope, projectScope } from '../../shared/middlewares/global.middleware';
import { stringifyQuery } from './data-tables.utils';

const handleError = (error: unknown) => {
	if (error instanceof DataTableNotFoundError) {
		throw new NotFoundError(error.message);
	}
	if (error instanceof DataTableValidationError) {
		throw new BadRequestError(error.message);
	}

	throw error;
};

type DataTableRowsHandlers = {
	updateDataTableRows: PublicAPIEndpoint<DataTableRequest.UpdateRows>;
	clearDataTableRows: PublicAPIEndpoint<DataTableRequest.Clear>;
	deleteDataTableRows: PublicAPIEndpoint<DataTableRequest.DeleteRows>;
};

const dataTableRowsHandlers: DataTableRowsHandlers = {
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

				await assertRowReadAccessIfReturningRows(req.user, dataTableId, { dryRun, returnData });

				const result = await service.updateRows(dataTableId, projectId, params, returnData, dryRun);

				return res.json(result);
			} catch (error) {
				return handleError(error);
			}
		},
	],

	clearDataTableRows: [
		publicApiScope('dataTableRow:delete'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req, res) => {
			try {
				const { dataTableId } = req.params;

				const projectId =
					await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);

				const result = await Container.get(DataTableService).clearRows(dataTableId, projectId);

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

				await assertRowReadAccessIfReturningRows(req.user, dataTableId, { dryRun, returnData });

				const result = await service.deleteRows(dataTableId, projectId, params, returnData, dryRun);

				return res.json(result);
			} catch (error) {
				return handleError(error);
			}
		},
	],
};

export = dataTableRowsHandlers;
