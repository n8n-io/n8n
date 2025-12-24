import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';

import type { DataTableRequest } from '../../../types';
import { apiKeyHasScope } from '../../shared/middlewares/global.middleware';
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

const getUserProject = async (userId: string) => {
	return await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(userId);
};

export = {
	getDataTableRows: [
		apiKeyHasScope('dataTableRow:read'),
		async (req: DataTableRequest.GetRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { skip, take, sortBy, search } = req.query;
				const filterString = req.query.filter as string | undefined;
				const filter = filterString ? JSON.parse(filterString) : undefined;

				const project = await getUserProject(req.user.id);

				const result = await Container.get(DataTableService).getManyRowsAndCount(
					dataTableId,
					project.id,
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
		async (req: DataTableRequest.InsertRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { data, returnType } = req.body;

				const project = await getUserProject(req.user.id);

				const result = await Container.get(DataTableService).insertRows(
					dataTableId,
					project.id,
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
		async (req: DataTableRequest.UpdateRows, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { filter, data, returnData = false, dryRun = false } = req.body;

				const project = await getUserProject(req.user.id);

				const result = await Container.get(DataTableService).updateRows(
					dataTableId,
					project.id,
					{ filter, data },
					returnData,
					dryRun,
				);

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	upsertDataTableRow: [
		apiKeyHasScope('dataTableRow:upsert'),
		async (req: DataTableRequest.UpsertRow, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;
				const { filter, data, returnData = false, dryRun = false } = req.body;

				const project = await getUserProject(req.user.id);

				const result = await Container.get(DataTableService).upsertRow(
					dataTableId,
					project.id,
					{ filter, data },
					returnData,
					dryRun,
				);

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	deleteDataTableRows: [
		apiKeyHasScope('dataTableRow:delete'),
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

				const project = await getUserProject(req.user.id);

				const returnDataBool = returnData === 'true' || returnData === true;
				const dryRunBool = dryRun === 'true' || dryRun === true;

				const result = await Container.get(DataTableService).deleteRows(
					dataTableId,
					project.id,
					{ filter },
					returnDataBool,
					dryRunBool,
				);

				return res.json(result);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],
};
