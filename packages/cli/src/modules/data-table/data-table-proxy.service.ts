import type { DataTableListOptions, ListDataTableQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	InstanceWriteAccessService,
	ProjectScopeService,
	WorkflowProjectService,
} from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { type Scope } from '@n8n/permissions';
import {
	AddDataTableColumnOptions,
	CreateDataTableOptions,
	DataTable,
	DataTableColumn,
	DataTableProxyProvider,
	DataTableRows,
	DeleteDataTableRowsOptions,
	IDataTableProjectAggregateService,
	IDataTableProjectService,
	DataTableInsertRowsReturnType,
	INode,
	ListDataTableOptions,
	ListDataTableRowsOptions,
	MoveDataTableColumnOptions,
	UpdateDataTableOptions,
	UpdateDataTableRowOptions,
	UpsertDataTableRowOptions,
	Workflow,
	NodeOperationError,
} from 'n8n-workflow';

import { DataTableAggregateService } from './data-table-aggregate.service';
import { assertSchemaWriteAccess } from './data-table-permissions';
import { DataTableService } from './data-table.service';
import { DataTableNotFoundError } from './errors/data-table-not-found.error';

const ALLOWED_NODES = [
	'n8n-nodes-base.dataTable',
	'n8n-nodes-base.dataTableTool',
	'n8n-nodes-base.evaluationTrigger',
	'n8n-nodes-base.evaluation',
] as const;

type AllowedNode = (typeof ALLOWED_NODES)[number];

export function isAllowedNode(s: string): s is AllowedNode {
	return ALLOWED_NODES.includes(s as AllowedNode);
}

/**
 * What the node is told when the table it names is not in the workflow's
 * project. Shared with the engine v2 control plane, so both engines say it
 * the same way.
 */
export function dataTableNotFoundInProject(dataTableId: string) {
	return {
		message: `Data table with ID '${dataTableId}' could not be found in this project`,
		description:
			'It may have been deleted, or skipped when the workflow was imported. Choose an existing data table in the node.',
	};
}

@Service()
export class DataTableProxyService implements DataTableProxyProvider {
	constructor(
		private readonly dataTableService: DataTableService,
		private readonly dataTableAggregateService: DataTableAggregateService,
		private readonly workflowProjectService: WorkflowProjectService,
		private readonly logger: Logger,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
		private readonly projectScopeService: ProjectScopeService,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	private validateRequest(node: INode) {
		if (!isAllowedNode(node.type)) {
			throw new Error('This proxy is only available for Data table nodes');
		}
	}

	private async getProjectId(workflow: Workflow) {
		const homeProject = await this.workflowProjectService.getWorkflowProjectCached(workflow.id);
		return homeProject.id;
	}

	async getDataTableAggregateProxy(
		workflow: Workflow,
		node: INode,
		projectId?: string,
	): Promise<IDataTableProjectAggregateService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeAggregateOperations(projectId);
	}

	async getDataTableProxy(
		workflow: Workflow,
		node: INode,
		dataTableId: string,
		projectId?: string,
	): Promise<IDataTableProjectService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		try {
			await this.dataTableService.validateDataTableExists(dataTableId, projectId);
		} catch (error) {
			if (error instanceof DataTableNotFoundError) {
				const { message, description } = dataTableNotFoundInProject(dataTableId);
				throw new NodeOperationError(node, message, { description });
			}
			throw error;
		}

		return this.makeDataTableOperations(projectId, dataTableId);
	}

	private async requireScope(user: User, scope: Scope, projectId: string): Promise<void> {
		const projectIds = await this.projectScopeService.getProjectIds(user, [scope]);
		if (projectIds !== null && !projectIds.includes(projectId)) {
			throw new Error(`User does not have '${scope}' access on project '${projectId}'`);
		}
	}

	makeDataTableOperationsForUser(user: User) {
		const dataTableService = this.dataTableService;
		const dataTableAggregateService = this.dataTableAggregateService;
		const requireScope = async (scope: Scope, projectId: string) =>
			await this.requireScope(user, scope, projectId);
		const instanceWriteAccess = this.instanceWriteAccess;

		return {
			// dataTable:listProject
			async getManyAndCount(options: ListDataTableQueryDto) {
				return await dataTableAggregateService.getManyAndCount(user, options);
			},

			// dataTable:create
			async createDataTable(projectId: string, options: CreateDataTableOptions) {
				assertSchemaWriteAccess(instanceWriteAccess);
				await requireScope('dataTable:create', projectId);
				return await dataTableService.createDataTable(projectId, options);
			},

			// dataTable:read
			async getColumns(dataTableId: string, projectId: string) {
				await requireScope('dataTable:read', projectId);
				return await dataTableService.getColumns(dataTableId, projectId);
			},

			// dataTable:update
			async updateDataTable(
				dataTableId: string,
				projectId: string,
				options: UpdateDataTableOptions,
			) {
				assertSchemaWriteAccess(instanceWriteAccess);
				await requireScope('dataTable:update', projectId);
				return await dataTableService.updateDataTable(dataTableId, projectId, options);
			},

			async addColumn(dataTableId: string, projectId: string, options: AddDataTableColumnOptions) {
				assertSchemaWriteAccess(instanceWriteAccess);
				await requireScope('dataTable:update', projectId);
				return await dataTableService.addColumn(dataTableId, projectId, options);
			},

			async deleteColumn(dataTableId: string, projectId: string, columnId: string) {
				assertSchemaWriteAccess(instanceWriteAccess);
				await requireScope('dataTable:update', projectId);
				return await dataTableService.deleteColumn(dataTableId, projectId, columnId);
			},

			async renameColumn(
				dataTableId: string,
				projectId: string,
				columnId: string,
				options: { name: string },
			) {
				assertSchemaWriteAccess(instanceWriteAccess);
				await requireScope('dataTable:update', projectId);
				return await dataTableService.renameColumn(dataTableId, projectId, columnId, options);
			},

			// dataTable:delete
			async deleteDataTable(dataTableId: string, projectId: string) {
				assertSchemaWriteAccess(instanceWriteAccess);
				await requireScope('dataTable:delete', projectId);
				return await dataTableService.deleteDataTable(dataTableId, projectId);
			},

			// dataTable:readRow
			async getManyRowsAndCount(
				dataTableId: string,
				projectId: string,
				options: Partial<ListDataTableRowsOptions>,
			) {
				await requireScope('dataTable:readRow', projectId);
				return await dataTableService.getManyRowsAndCount(dataTableId, projectId, options);
			},

			// dataTable:writeRow
			async insertRows<T extends DataTableInsertRowsReturnType>(
				dataTableId: string,
				projectId: string,
				rows: DataTableRows,
				returnType: T,
			) {
				await requireScope('dataTable:writeRow', projectId);
				return await dataTableService.insertRows(dataTableId, projectId, rows, returnType);
			},

			async updateRows(dataTableId: string, projectId: string, options: UpdateDataTableRowOptions) {
				await requireScope('dataTable:writeRow', projectId);
				// unconditional because this proxy always returns the affected rows
				await requireScope('dataTable:readRow', projectId);
				return await dataTableService.updateRows(
					dataTableId,
					projectId,
					{ filter: options.filter, data: options.data },
					true,
					options.dryRun,
				);
			},

			async deleteRows(
				dataTableId: string,
				projectId: string,
				options: DeleteDataTableRowsOptions,
			) {
				await requireScope('dataTable:writeRow', projectId);
				// unconditional because this proxy always returns the affected rows
				await requireScope('dataTable:readRow', projectId);
				return await dataTableService.deleteRows(
					dataTableId,
					projectId,
					{ filter: options.filter },
					true,
					options.dryRun,
				);
			},

			async clearRows(dataTableId: string, projectId: string) {
				await requireScope('dataTable:writeRow', projectId);
				return await dataTableService.clearRows(dataTableId, projectId);
			},
		};
	}

	/** The operations of one project. Public for the engine v2 control plane, which resolves the project itself. */
	makeAggregateOperations(projectId: string): IDataTableProjectAggregateService {
		const dataTableService = this.dataTableService;
		return {
			getProjectId() {
				return projectId;
			},

			async getManyAndCount(options: ListDataTableOptions = {}) {
				// The pinned project last, so a filter cannot list another project.
				const serviceOptions: DataTableListOptions = {
					...options,
					filter: { ...(options.filter ?? {}), projectId },
				};
				return await dataTableService.getManyAndCount(serviceOptions);
			},

			async createDataTable(options: CreateDataTableOptions): Promise<DataTable> {
				return await dataTableService.createDataTable(projectId, options);
			},

			async deleteDataTableAll(): Promise<boolean> {
				return await dataTableService.deleteDataTableByProjectId(projectId);
			},
		};
	}

	/** The operations of one table. Every one checks that the table is in the project. */
	makeDataTableOperations(
		projectId: string,
		dataTableId: string,
	): Omit<IDataTableProjectService, keyof IDataTableProjectAggregateService> {
		const dataTableService = this.dataTableService;

		return {
			// DataTable management
			async updateDataTable(options: UpdateDataTableOptions): Promise<boolean> {
				return await dataTableService.updateDataTable(dataTableId, projectId, options);
			},

			async deleteDataTable(): Promise<boolean> {
				return await dataTableService.deleteDataTable(dataTableId, projectId);
			},

			// Column operations
			async getColumns(): Promise<DataTableColumn[]> {
				return await dataTableService.getColumns(dataTableId, projectId);
			},

			async addColumn(options: AddDataTableColumnOptions): Promise<DataTableColumn> {
				return await dataTableService.addColumn(dataTableId, projectId, options);
			},

			async moveColumn(columnId: string, options: MoveDataTableColumnOptions): Promise<boolean> {
				return await dataTableService.moveColumn(dataTableId, projectId, columnId, options);
			},

			async deleteColumn(columnId: string): Promise<boolean> {
				return await dataTableService.deleteColumn(dataTableId, projectId, columnId);
			},

			// Row operations
			async getManyRowsAndCount(options: Partial<ListDataTableRowsOptions>) {
				return await dataTableService.getManyRowsAndCount(dataTableId, projectId, options);
			},

			async insertRows<T extends DataTableInsertRowsReturnType>(
				rows: DataTableRows,
				returnType: T,
			) {
				return await dataTableService.insertRows(dataTableId, projectId, rows, returnType);
			},

			async updateRows(options: UpdateDataTableRowOptions) {
				return await dataTableService.updateRows(
					dataTableId,
					projectId,
					{ filter: options.filter, data: options.data },
					true,
					options.dryRun,
				);
			},

			async upsertRow(options: UpsertDataTableRowOptions) {
				return await dataTableService.upsertRow(
					dataTableId,
					projectId,
					options,
					true,
					options.dryRun,
				);
			},

			async deleteRows(options: DeleteDataTableRowsOptions) {
				return await dataTableService.deleteRows(
					dataTableId,
					projectId,
					{ filter: options.filter },
					true,
					options.dryRun,
				);
			},

			async clearRows() {
				return await dataTableService.clearRows(dataTableId, projectId);
			},
		};
	}
}

export type DataTableUserOperations = ReturnType<
	DataTableProxyService['makeDataTableOperationsForUser']
>;
