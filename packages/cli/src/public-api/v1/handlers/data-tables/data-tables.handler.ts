import {
	PublicApiListDataTableQueryDto,
	PublicApiCreateDataTableDto,
	UpdateDataTableDto,
} from '@n8n/api-types';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { Container } from '@n8n/di';
import type express from 'express';

import type { DataTableRequest } from '../../../types';
import {
	publicApiScope,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableNameConflictError } from '@/modules/data-table/errors/data-table-name-conflict.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import {
	getProjectIdForDataTable,
	getDataTableListFilter,
	resolveProjectIdForCreate,
} from './data-tables.service';
import { ProjectService } from '@/services/project.service.ee';

const handleError = (error: unknown, res: express.Response): express.Response => {
	if (error instanceof DataTableNotFoundError) {
		return res.status(404).json({ message: error.message });
	}
	if (error instanceof DataTableNameConflictError) {
		return res.status(409).json({ message: error.message });
	}
	if (error instanceof DataTableValidationError) {
		return res.status(400).json({ message: error.message });
	}
	if (error instanceof ForbiddenError) {
		return res.status(error.httpStatusCode).json({ message: error.message });
	}
	if (error instanceof Error) {
		return res.status(400).json({ message: error.message });
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

export = {
	listDataTables: [
		publicApiScope('dataTable:list'),
		validCursor,
		async (req: DataTableRequest.List, res: express.Response): Promise<express.Response> => {
			try {
				const payload = PublicApiListDataTableQueryDto.safeParse(stringifyQuery(req.query));
				if (!payload.success) {
					return res.status(400).json({
						message: payload.error.errors[0]?.message || 'Invalid query parameters',
					});
				}

				const { offset, limit, filter, sortBy } = payload.data;

				const providedFilter = filter ?? {};
				const { projectId: requestedProjectId, ...restFilter } = providedFilter;

				const isGlobalOwnerOrAdmin = ['global:owner', 'global:admin'].includes(req.user.role.slug);

				if (requestedProjectId && !isGlobalOwnerOrAdmin) {
					const projectWithScope = await Container.get(ProjectService).getProjectWithScope(
						req.user,
						requestedProjectId,
						['dataTable:listProject'],
					);
					if (!projectWithScope) return res.json({ data: [], nextCursor: null });
				}

				const finalFilter = await getDataTableListFilter(
					req.user.id,
					isGlobalOwnerOrAdmin,
					requestedProjectId,
					restFilter,
				);

				const result = await Container.get(DataTableService).getManyAndCount({
					skip: offset,
					take: limit,
					filter: finalFilter,
					sortBy,
				});

				const data = result.data.map(({ project: _project, ...rest }) => rest);

				return res.json({
					data,
					nextCursor: encodeNextCursor({
						offset,
						limit,
						numberOfTotalRecords: result.count,
					}),
				});
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	createDataTable: [
		publicApiScope('dataTable:create'),
		async (req: DataTableRequest.Create, res: express.Response): Promise<express.Response> => {
			const payload = PublicApiCreateDataTableDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message || 'Invalid request body');
			}

			const { projectId: requestedProjectId, ...dto } = payload.data;

			const projectId = await resolveProjectIdForCreate(req.user, requestedProjectId);

			try {
				const result = await Container.get(DataTableService).createDataTable(projectId, dto);

				const { project: _project, ...dataTable } = result;

				return res.status(201).json(dataTable);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	getDataTable: [
		publicApiScope('dataTable:read'),
		projectScope('dataTable:read', 'dataTable'),
		async (req: DataTableRequest.Get, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;

				const projectId = await getProjectIdForDataTable(dataTableId);

				const result = await Container.get(DataTableRepository).findOne({
					where: { id: dataTableId, project: { id: projectId } },
					relations: ['project', 'columns'],
				});

				if (!result) {
					throw new DataTableNotFoundError(dataTableId);
				}

				const { project: _project, ...dataTable } = result;

				return res.json(dataTable);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	updateDataTable: [
		publicApiScope('dataTable:update'),
		projectScope('dataTable:update', 'dataTable'),
		async (req: DataTableRequest.Update, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;

				const payload = UpdateDataTableDto.safeParse(req.body);
				if (!payload.success) {
					return res.status(400).json({
						message: payload.error.errors[0]?.message || 'Invalid request body',
					});
				}

				const projectId = await getProjectIdForDataTable(dataTableId);

				await Container.get(DataTableService).updateDataTable(dataTableId, projectId, payload.data);

				const result = await Container.get(DataTableRepository).findOne({
					where: { id: dataTableId, project: { id: projectId } },
					relations: ['project', 'columns'],
				});

				if (!result) {
					throw new DataTableNotFoundError(dataTableId);
				}

				const { project: _project, ...dataTable } = result;

				return res.json(dataTable);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	deleteDataTable: [
		publicApiScope('dataTable:delete'),
		projectScope('dataTable:delete', 'dataTable'),
		async (req: DataTableRequest.Delete, res: express.Response): Promise<express.Response> => {
			try {
				const { dataTableId } = req.params;

				const projectId = await getProjectIdForDataTable(dataTableId);

				await Container.get(DataTableService).deleteDataTable(dataTableId, projectId);

				return res.status(204).send();
			} catch (error) {
				return handleError(error, res);
			}
		},
	],
};
