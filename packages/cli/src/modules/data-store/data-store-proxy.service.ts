import type { ListDataStoreContentQueryDto, DataStoreListOptions } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	DataStoreColumn,
	DataStoreRows,
	IDataStoreProjectService,
	INode,
	ListDataStoreOptions,
	Workflow,
} from 'n8n-workflow';

import { DataStoreService } from './data-store.service';

import { OwnershipService } from '@/services/ownership.service';

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
	): Promise<Pick<IDataStoreProjectService, 'getManyAndCount'> & Partial<IDataStoreProjectService>>;
	async getDataStoreProxy(
		workflow: Workflow,
		node: INode,
		dataStoreId?: string,
	): Promise<IDataStoreProjectService>;
	async getDataStoreProxy<T extends string | undefined>(
		workflow: Workflow,
		node: INode,
		dataStoreId?: T,
	): Promise<
		Pick<IDataStoreProjectService, 'getManyAndCount'> & Partial<IDataStoreProjectService>
	> {
		if (node.type !== 'n8n-nodes-base.dataStore') {
			throw new Error('This proxy is only available for data store nodes');
		}

		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
		const projectId = homeProject.id;
		const dataStoreService = this.dataStoreService;
		const rowOperations =
			dataStoreId === undefined
				? {}
				: {
						async getManyRowsAndCount(dto: Partial<ListDataStoreContentQueryDto>) {
							return await dataStoreService.getManyRowsAndCount(dataStoreId, dto);
						},

						async getColumns(): Promise<DataStoreColumn[]> {
							return await dataStoreService.getColumns(dataStoreId);
						},

						async insertRows(rows: DataStoreRows) {
							return await dataStoreService.insertRows(dataStoreId, rows);
						},
					};
		return {
			...rowOperations,
			async getManyAndCount(options: ListDataStoreOptions = {}) {
				const serviceOptions: DataStoreListOptions = {
					...options,
					filter: { projectId, ...(options.filter ?? {}) },
				};
				return await dataStoreService.getManyAndCount(serviceOptions);
			},
		};
	}
}
