import type { DataStoreListOptions } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	AddDataStoreColumnOptions,
	CreateDataStoreOptions,
	DataStore,
	DataStoreColumn,
	DataStoreRows,
	IDataStoreProjectService,
	INode,
	ListDataStoreOptions,
	ListDataStoreRowsOptions,
	MoveDataStoreColumnOptions,
	UpdateDataStoreOptions,
	UpsertDataStoreRowsOptions,
	Workflow,
} from 'n8n-workflow';

// Aggregate operations (project-level, don't require specific dataStoreId)
type DataStoreAggregateOperations = Pick<
	IDataStoreProjectService,
	'getManyAndCount' | 'createDataStore' | 'deleteDataStoreAll'
>;

import { OwnershipService } from '@/services/ownership.service';

import { DataStoreService } from './data-store.service';

@Service()
export class DataStoreProxyService {
	constructor(
		private readonly dataStoreService: DataStoreService,
		private readonly ownershipService: OwnershipService,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('data-store');
	}

	async getDataStoreProxy(
		workflow: Workflow,
		node: INode,
		dataStoreId?: undefined,
	): Promise<DataStoreAggregateOperations>;
	async getDataStoreProxy(
		workflow: Workflow,
		node: INode,
		dataStoreId?: string,
	): Promise<IDataStoreProjectService>;
	async getDataStoreProxy<T extends string | undefined>(
		workflow: Workflow,
		node: INode,
		dataStoreId?: T,
	): Promise<IDataStoreProjectService | DataStoreAggregateOperations> {
		if (node.type !== 'n8n-nodes-base.dataStore') {
			throw new Error('This proxy is only available for data store nodes');
		}

		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
		const projectId = homeProject.id;
		const dataStoreService = this.dataStoreService;

		const aggregateOperations = {
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

		const dataStoreSpecificOperations =
			dataStoreId === undefined
				? {}
				: {
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

						async moveColumn(
							columnId: string,
							options: MoveDataStoreColumnOptions,
						): Promise<boolean> {
							return await dataStoreService.moveColumn(dataStoreId, projectId, columnId, options);
						},

						async deleteColumn(columnId: string): Promise<boolean> {
							return await dataStoreService.deleteColumn(dataStoreId, projectId, columnId);
						},

						// Row operations
						async getManyRowsAndCount(options: Partial<ListDataStoreRowsOptions>) {
							return await dataStoreService.getManyRowsAndCount(dataStoreId, projectId, options);
						},

						async insertRows(rows: DataStoreRows) {
							return await dataStoreService.insertRows(dataStoreId, projectId, rows);
						},

						async upsertRows(options: UpsertDataStoreRowsOptions) {
							return await dataStoreService.upsertRows(dataStoreId, projectId, options);
						},
					};

		return {
			...aggregateOperations,
			...dataStoreSpecificOperations,
		};
	}
}
