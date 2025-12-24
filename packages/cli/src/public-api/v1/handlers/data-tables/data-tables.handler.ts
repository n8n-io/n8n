import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { Container } from '@n8n/di';
import type express from 'express';

import type { DataTableRequest } from '../../../types';
import { apiKeyHasScope, projectScope } from '../../shared/middlewares/global.middleware';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

const handleError = (error: unknown, res: express.Response): express.Response => {
	if (error instanceof DataTableNotFoundError) {
		return res.status(404).json({ message: error.message });
	}
	if (error instanceof DataTableValidationError) {
		return res.status(400).json({ message: error.message });
	}
	if (error instanceof Error) {
		return res.status(400).json({ message: error.message });
	}
	throw error;
};

/**
 * Gets the project ID for a data table.
 * Called AFTER projectScope middleware has validated access.
 */
const getProjectIdForDataTable = async (dataTableId: string): Promise<string> => {
	const dataTable = await Container.get(DataTableRepository).findOne({
		where: { id: dataTableId },
		relations: ['project'],
	});

	if (!dataTable) {
		throw new DataTableNotFoundError(dataTableId);
	}

	return dataTable.project.id;
};

export = {
	getDataTableRows: [
		apiKeyHasScope('dataTableRow:read'),
		projectScope('dataTable:readRow', 'dataTable'),
		async (req: DataTableRequest.GetRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { skip, take, sortBy, search } = req.query;
				const filterString = req.query.filter as string | undefined;
				const filter = filterString ? JSON.parse(filterString) : undefined;

				const projectId = await getProjectIdForDataTable(dataTableId);

				const result = await Container.get(DataTableService).getManyRowsAndCount(
					dataTableId,
					projectId,
					{ skip, take, filter, sortBy, search },
				);

				return res.json({
					data: result.data,
					count: result.count,
				});
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	insertDataTableRows: [
		apiKeyHasScope('dataTableRow:create'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req: DataTableRequest.InsertRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { data, returnType } = req.body;

				const projectId = await getProjectIdForDataTable(dataTableId);

				const result = await Container.get(DataTableService).insertRows(
					dataTableId,
					projectId,
					data,
					returnType,
				);

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	updateDataTableRows: [
		apiKeyHasScope('dataTableRow:update'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req: DataTableRequest.UpdateRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { filter, data, returnData = false, dryRun = false } = req.body;

				const projectId = await getProjectIdForDataTable(dataTableId);

				let result;
				if (dryRun) {
					result = await Container.get(DataTableService).updateRows(
						dataTableId,
						projectId,
						{ filter, data },
						returnData,
						true,
					);
				} else if (returnData) {
					result = await Container.get(DataTableService).updateRows(
						dataTableId,
						projectId,
						{ filter, data },
						true,
						false,
					);
				} else {
					result = await Container.get(DataTableService).updateRows(
						dataTableId,
						projectId,
						{ filter, data },
						false,
						false,
					);
				}

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	upsertDataTableRow: [
		apiKeyHasScope('dataTableRow:upsert'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req: DataTableRequest.UpsertRow, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { filter, data, returnData = false, dryRun = false } = req.body;

				const projectId = await getProjectIdForDataTable(dataTableId);

				let result;
				if (dryRun) {
					result = await Container.get(DataTableService).upsertRow(
						dataTableId,
						projectId,
						{ filter, data },
						returnData,
						true,
					);
				} else if (returnData) {
					result = await Container.get(DataTableService).upsertRow(
						dataTableId,
						projectId,
						{ filter, data },
						true,
						false,
					);
				} else {
					result = await Container.get(DataTableService).upsertRow(
						dataTableId,
						projectId,
						{ filter, data },
						false,
						false,
					);
				}

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	deleteDataTableRows: [
		apiKeyHasScope('dataTableRow:delete'),
		projectScope('dataTable:writeRow', 'dataTable'),
		async (req: DataTableRequest.DeleteRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { filter: filterString, returnData, dryRun } = req.query;

				if (!filterString) {
					return res.status(400).json({
						message:
							'Filter is required for delete operations to prevent accidental deletion of all data',
					});
				}

				const filter = JSON.parse(filterString);

				const projectId = await getProjectIdForDataTable(dataTableId);

				const returnDataBool = returnData === 'true' || returnData === true;
				const dryRunBool = dryRun === 'true' || dryRun === true;

				let result;
				if (dryRunBool) {
					result = await Container.get(DataTableService).deleteRows(
						dataTableId,
						projectId,
						{ filter },
						returnDataBool,
						true,
					);
				} else if (returnDataBool) {
					result = await Container.get(DataTableService).deleteRows(
						dataTableId,
						projectId,
						{ filter },
						true,
						false,
					);
				} else {
					result = await Container.get(DataTableService).deleteRows(
						dataTableId,
						projectId,
						{ filter },
						false,
						false,
					);
				}

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],
};
