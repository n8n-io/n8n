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

	async addColumn(
		dataStoreId: DataStoreUserTableName,
		columns: [DataStoreColumn, ...DataStoreColumn[]],
	) {
		await this.manager.query(...addColumnQuery(dataStoreId, columns));
	}

	async deleteColumn(dataStoreId: DataStoreUserTableName, columns: [string, ...string[]]) {
		await this.manager.query(...deleteColumnQuery(dataStoreId, columns));
	}
}
