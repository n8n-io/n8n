import {
	PublicApiListDataTableQueryDto,
	CreateDataTableDto,
	UpdateDataTableDto,
} from '@n8n/api-types';
import { ProjectRepository, ProjectRelationRepository } from '@n8n/db';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { Container } from '@n8n/di';
import type express from 'express';

import type { DataTableRequest } from '../../../types';
import {
	apiKeyHasScope,
	projectScope,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { DataTableNotFoundError } from '@/modules/data-table/errors/data-table-not-found.error';
import { DataTableNameConflictError } from '@/modules/data-table/errors/data-table-name-conflict.error';
import { DataTableValidationError } from '@/modules/data-table/errors/data-table-validation.error';

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
	listDataTables: [
		apiKeyHasScope('dataTable:list'),
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
				const { projectId: _ignoredProjectId, ...restFilter } = providedFilter;

				const isGlobalOwnerOrAdmin = ['global:owner', 'global:admin'].includes(req.user.role.slug);

				let finalFilter: any;
				if (isGlobalOwnerOrAdmin) {
					finalFilter = restFilter;
				} else {
					const personalProject = await Container.get(
						ProjectRepository,
					).getPersonalProjectForUserOrFail(req.user.id);

					const projectRelations = await Container.get(ProjectRelationRepository).find({
						where: { userId: req.user.id },
						relations: ['project'],
					});

					const teamProjectIds = projectRelations
						.filter((rel) => rel.project.type === 'team')
						.map((rel) => rel.projectId);

					const allAccessibleProjectIds = [personalProject.id, ...teamProjectIds];

					finalFilter = {
						...restFilter,
						projectId: allAccessibleProjectIds,
					};
				}

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
		apiKeyHasScope('dataTable:create'),
		async (req: DataTableRequest.Create, res: express.Response): Promise<express.Response> => {
			try {
				const payload = CreateDataTableDto.safeParse(req.body);
				if (!payload.success) {
					return res.status(400).json({
						message: payload.error.errors[0]?.message || 'Invalid request body',
					});
				}

				const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
					req.user.id,
				);

				const result = await Container.get(DataTableService).createDataTable(
					project.id,
					payload.data,
				);

				const { project: _project, ...dataTable } = result;

				return res.status(201).json(dataTable);
			} catch (error) {
				return handleError(error, res);
			}
		},
	],

	getDataTable: [
		apiKeyHasScope('dataTable:read'),
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
		apiKeyHasScope('dataTable:update'),
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
		apiKeyHasScope('dataTable:delete'),
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
