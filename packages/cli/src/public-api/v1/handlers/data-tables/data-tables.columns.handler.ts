import { AddDataTableColumnDto, updateDataTableColumnSchema } from '@n8n/api-types';
import { Container } from '@n8n/di';
import type express from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableColumnNameConflictError } from '@/modules/data-table/errors/data-table-column-name-conflict.error';
import { DataTableSystemColumnNameConflictError } from '@/modules/data-table/errors/data-table-system-column-name-conflict.error';

import type { DataTableRequest } from '../../../types';
import { projectScope, publicApiScope } from '../../shared/middlewares/global.middleware';

export = {
	listDataTableColumns: [
		publicApiScope('dataTableColumn:read'),
		projectScope('dataTable:readColumn', 'dataTable'),
		async (req: DataTableRequest.ListColumns, res: express.Response) => {
			const { dataTableId } = req.params;
			const projectId = await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);
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
			const projectId = await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);

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
			const projectId = await Container.get(DataTableService).getProjectIdForDataTable(dataTableId);
			await Container.get(DataTableService).deleteColumn(dataTableId, projectId, columnId);
			return res.status(204).send();
		},
	],

	updateDataTableColumn: [
		publicApiScope('dataTableColumn:update'),
		projectScope('dataTable:writeColumn', 'dataTable'),
		async (req: DataTableRequest.UpdateColumn, res: express.Response) => {
			try {
				const { dataTableId, columnId } = req.params;
				const payload = updateDataTableColumnSchema.safeParse(req.body);
				if (!payload.success) {
					throw new BadRequestError(payload.error.errors[0]?.message);
				}

				const { name, index } = payload.data;

				const service = Container.get(DataTableService);
				const projectId = await service.getProjectIdForDataTable(dataTableId);

				if (name !== undefined) {
					await service.renameColumn(dataTableId, projectId, columnId, { name });
				}
				if (index !== undefined) {
					await service.moveColumn(dataTableId, projectId, columnId, { targetIndex: index });
				}

				const updatedColumn = await service.getColumnById({ projectId, dataTableId, columnId });
				return res.json(updatedColumn);
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
};
