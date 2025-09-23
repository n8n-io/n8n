import type { DataStoreListOptions } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	AddDataStoreColumnOptions,
	CreateDataStoreOptions,
	DataStore,
	DataStoreColumn,
	DataStoreProxyProvider,
	DataStoreRows,
	DeleteDataTableRowsOptions,
	IDataStoreProjectAggregateService,
	IDataStoreProjectService,
	DataTableInsertRowsReturnType,
	INode,
	ListDataStoreOptions,
	ListDataStoreRowsOptions,
	MoveDataStoreColumnOptions,
	UpdateDataStoreOptions,
	UpdateDataStoreRowOptions,
	UpsertDataStoreRowOptions,
	Workflow,
} from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';

import { DataStoreService } from './data-store.service';

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
export class DataStoreProxyService implements DataStoreProxyProvider {
	constructor(
		private readonly dataStoreService: DataStoreService,
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

	async getDataStoreAggregateProxy(
		workflow: Workflow,
		node: INode,
		projectId?: string,
	): Promise<IDataStoreProjectAggregateService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeAggregateOperations(projectId);
	}

	async getDataStoreProxy(
		workflow: Workflow,
		node: INode,
		dataStoreId: string,
		projectId?: string,
	): Promise<IDataStoreProjectService> {
		this.validateRequest(node);
		projectId = projectId ?? (await this.getProjectId(workflow));

		return this.makeDataStoreOperations(projectId, dataStoreId);
	}

	private makeAggregateOperations(projectId: string): IDataStoreProjectAggregateService {
		const dataStoreService = this.dataStoreService;
		return {
			getProjectId() {
				return projectId;
			},

			async getManyAndCount(options: ListDataStoreOptions = {}) {
				const serviceOptions: DataStoreListOptions = {
					...options,
					filter: { projectId, ...(options.filter ?? {}) },
				};
				return await dataStoreService.getManyAndCount(serviceOptions);
			},

			async createDataStore(options: CreateDataStoreOptions): Promise<DataStore> {
				return await dataStoreService.createDataStore(projectId, options);
			},

			async deleteDataStoreAll(): Promise<boolean> {
				return await dataStoreService.deleteDataStoreByProjectId(projectId);
			},
		};
	}

	private makeDataStoreOperations(
		projectId: string,
		dataStoreId: string,
	): Omit<IDataStoreProjectService, keyof IDataStoreProjectAggregateService> {
		const dataStoreService = this.dataStoreService;

		return {
			// DataStore management
			async updateDataStore(options: UpdateDataStoreOptions): Promise<boolean> {
				return await dataStoreService.updateDataStore(dataStoreId, projectId, options);
			},

			async deleteDataStore(): Promise<boolean> {
				return await dataStoreService.deleteDataStore(dataStoreId, projectId);
			},

			// Column operations
			async getColumns(): Promise<DataStoreColumn[]> {
				return await dataStoreService.getColumns(dataStoreId, projectId);
			},

			async addColumn(options: AddDataStoreColumnOptions): Promise<DataStoreColumn> {
				return await dataStoreService.addColumn(dataStoreId, projectId, options);
			},

			async moveColumn(columnId: string, options: MoveDataStoreColumnOptions): Promise<boolean> {
				return await dataStoreService.moveColumn(dataStoreId, projectId, columnId, options);
			},

			async deleteColumn(columnId: string): Promise<boolean> {
				return await dataStoreService.deleteColumn(dataStoreId, projectId, columnId);
			},

			// Row operations
			async getManyRowsAndCount(options: Partial<ListDataStoreRowsOptions>) {
				return await dataStoreService.getManyRowsAndCount(dataStoreId, projectId, options);
			},

			async insertRows<T extends DataTableInsertRowsReturnType>(
				rows: DataStoreRows,
				returnType: T,
			) {
				return await dataStoreService.insertRows(dataStoreId, projectId, rows, returnType);
			},

			async updateRow(options: UpdateDataStoreRowOptions) {
				return await dataStoreService.updateRow(dataStoreId, projectId, options, true);
			},

			async upsertRow(options: UpsertDataStoreRowOptions) {
				return await dataStoreService.upsertRow(dataStoreId, projectId, options, true);
			},

			async deleteRows(options: DeleteDataTableRowsOptions) {
				return await dataStoreService.deleteRows(dataStoreId, projectId, options, true);
			},
		};
	}
}
