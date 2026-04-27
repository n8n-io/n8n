import { AddDataTableColumnDto } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type express from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableColumnNameConflictError } from '@/modules/data-table/errors/data-table-column-name-conflict.error';
import { DataTableSystemColumnNameConflictError } from '@/modules/data-table/errors/data-table-system-column-name-conflict.error';

import { getProjectIdForDataTable } from './data-tables.service';
import type { DataTableRequest } from '../../../types';
import { projectScope, publicApiScope } from '../../shared/middlewares/global.middleware';

export = {
	listDataTableColumns: [
		publicApiScope('dataTableColumn:read'),
		projectScope('dataTable:readColumn', 'dataTable'),
		async (req: DataTableRequest.ListColumns, res: express.Response) => {
			const { dataTableId } = req.params;
			const projectId = await getProjectIdForDataTable(dataTableId);
			return res.json(await Container.get(DataTableService).getColumns(dataTableId, projectId));
		},
	],

	createDataTableColumn: [
		publicApiScope('dataTableColumn:create'),
		projectScope('dataTable:writeColumn', 'dataTable'),
		async (req: DataTableRequest.CreateColumn, res: express.Response) => {
			const { dataTableId } = req.params;
			const payload = AddDataTableColumnDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message);
			}
			const projectId = await getProjectIdForDataTable(dataTableId);

			try {
				const column = await Container.get(DataTableService).addColumn(
					dataTableId,
					projectId,
					payload.data,
				);
				return res.status(201).json(column);
			} catch (error) {
				if (
					error instanceof DataTableColumnNameConflictError ||
					error instanceof DataTableSystemColumnNameConflictError
				) {
					throw new ConflictError(error.message);
				}
				throw error;
			}
		},
	],

	deleteDataTableColumn: [
		publicApiScope('dataTableColumn:delete'),
		projectScope('dataTable:writeColumn', 'dataTable'),
		async (req: DataTableRequest.DeleteColumn, res: express.Response) => {
			const { dataTableId, columnId } = req.params;
			const projectId = await getProjectIdForDataTable(dataTableId);
			await Container.get(DataTableService).deleteColumn(dataTableId, projectId, columnId);
			return res.status(204).send();
		},
	],
};
