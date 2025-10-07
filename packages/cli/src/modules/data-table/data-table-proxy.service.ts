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

import { DataTableService } from './data-table.service';

import { OwnershipService } from '@/services/ownership.service';

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
		private readonly dataTableService: DataTableService,
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
		dataTableId: string,
		projectId?: string,
	): Promise<IDataTableProjectService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeDataTableOperations(projectId, dataTableId);
	}

	private makeAggregateOperations(projectId: string): IDataTableProjectAggregateService {
		const dataTableService = this.dataTableService;
		return {
			getProjectId() {
				return projectId;
			},

			async getManyAndCount(options: ListDataTableOptions = {}) {
				const serviceOptions: DataTableListOptions = {
					...options,
					filter: { projectId, ...(options.filter ?? {}) },
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

	private makeDataTableOperations(
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
		};
	}
}
