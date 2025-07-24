import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DataStoreEntity } from './data-store.entity';
import { DataStoreColumn, DataStoreUserTableName } from './data-store.types';
import { createUserTableQuery } from './utils/sql-utils';

@Service()
export class DataStoreRepository extends Repository<DataStoreEntity> {
	constructor(dataSource: DataSource) {
		super(DataStoreEntity, dataSource.manager);
	}

	async createUserTable(tableName: DataStoreUserTableName, columns: DataStoreColumn[]) {
		await this.manager.query(...createUserTableQuery(tableName, columns));
	}

	async deleteUserTable(tableName: DataStoreUserTableName) {
		console.log(await this.manager.query("SELECT name FROM sqlite_master WHERE type='table'"));
		// await this.manager.query(`DROP TABLE ${tableName}`);
	}
}
