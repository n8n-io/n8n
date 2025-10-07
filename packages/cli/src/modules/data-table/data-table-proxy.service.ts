import type { DataTableListOptions } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
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
} from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';

import { DataTableService } from './data-table.service';

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

@Service()
export class DataTableProxyService implements DataTableProxyProvider {
	constructor(
		private readonly dataStoreService: DataTableService,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-table');
	}

	private validateRequest(node: INode) {
		if (!isAllowedNode(node.type)) {
			throw new Error('This proxy is only available for Data table nodes');
		}
	}

	private async getProjectId(workflow: Workflow) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
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
		dataStoreId: string,
		projectId?: string,
	): Promise<IDataTableProjectService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeDataTableOperations(projectId, dataStoreId);
	}

	private makeAggregateOperations(projectId: string): IDataTableProjectAggregateService {
		const dataStoreService = this.dataStoreService;
		return {
			getProjectId() {
				return projectId;
			},

			async getManyAndCount(options: ListDataTableOptions = {}) {
				const serviceOptions: DataTableListOptions = {
					...options,
					filter: { projectId, ...(options.filter ?? {}) },
				};
				return await dataStoreService.getManyAndCount(serviceOptions);
			},

			async createDataTable(options: CreateDataTableOptions): Promise<DataTable> {
				return await dataStoreService.createDataTable(projectId, options);
			},

			async deleteDataTableAll(): Promise<boolean> {
				return await dataStoreService.deleteDataTableByProjectId(projectId);
			},
		};
	}

	private makeDataTableOperations(
		projectId: string,
		dataStoreId: string,
	): Omit<IDataTableProjectService, keyof IDataTableProjectAggregateService> {
		const dataStoreService = this.dataStoreService;

		return {
			// DataTable management
			async updateDataTable(options: UpdateDataTableOptions): Promise<boolean> {
				return await dataStoreService.updateDataTable(dataStoreId, projectId, options);
			},

			async deleteDataTable(): Promise<boolean> {
				return await dataStoreService.deleteDataTable(dataStoreId, projectId);
			},

			// Column operations
			async getColumns(): Promise<DataTableColumn[]> {
				return await dataStoreService.getColumns(dataStoreId, projectId);
			},

			async addColumn(options: AddDataTableColumnOptions): Promise<DataTableColumn> {
				return await dataStoreService.addColumn(dataStoreId, projectId, options);
			},

			async moveColumn(columnId: string, options: MoveDataTableColumnOptions): Promise<boolean> {
				return await dataStoreService.moveColumn(dataStoreId, projectId, columnId, options);
			},

			async deleteColumn(columnId: string): Promise<boolean> {
				return await dataStoreService.deleteColumn(dataStoreId, projectId, columnId);
			},

			// Row operations
			async getManyRowsAndCount(options: Partial<ListDataTableRowsOptions>) {
				return await dataStoreService.getManyRowsAndCount(dataStoreId, projectId, options);
			},

			async insertRows<T extends DataTableInsertRowsReturnType>(
				rows: DataTableRows,
				returnType: T,
			) {
				return await dataStoreService.insertRows(dataStoreId, projectId, rows, returnType);
			},

			async updateRows(options: UpdateDataTableRowOptions) {
				return await dataStoreService.updateRows(
					dataStoreId,
					projectId,
					{ filter: options.filter, data: options.data },
					true,
					options.dryRun,
				);
			},

			async upsertRow(options: UpsertDataTableRowOptions) {
				return await dataStoreService.upsertRow(
					dataStoreId,
					projectId,
					options,
					true,
					options.dryRun,
				);
			},

			async deleteRows(options: DeleteDataTableRowsOptions) {
				return await dataStoreService.deleteRows(
					dataStoreId,
					projectId,
					{ filter: options.filter },
					true,
					options.dryRun,
				);
			},
		};
	}
}
