import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DataStoreColumnEntity } from './data-store-column.entity';
import { DataStoreColumn, DataStoreUserTableName } from './data-store.types';
import { addColumnQuery, deleteColumnQuery } from './utils/sql-utils';

@Service()
export class DataStoreColumnRepository extends Repository<DataStoreColumnEntity> {
	constructor(dataSource: DataSource) {
		super(DataStoreColumnEntity, dataSource.manager);
	}

	async getColumns(rawDataStoreId: string) {
		return await this.createQueryBuilder('dataStoreColumns')
			.where(`dataStoreColumns.dataStoreId = '${rawDataStoreId}'`)
			.getMany();
	}

	async addColumn(dataStoreId: DataStoreUserTableName, column: DataStoreColumn) {
		await this.manager.query(...addColumnQuery(dataStoreId, column));
	}

	async deleteColumn(dataStoreId: DataStoreUserTableName, column: string) {
		await this.manager.query(...deleteColumnQuery(dataStoreId, column));
	}
}
