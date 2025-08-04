import { DataStoreCreateColumnSchema, type DataStoreUserTableName } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DataStoreColumnEntity } from './data-store-column.entity';
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

	async addColumn(dataStoreId: DataStoreUserTableName, column: DataStoreCreateColumnSchema) {
		await this.manager.query(addColumnQuery(dataStoreId, column));
	}

	async deleteColumn(dataStoreId: DataStoreUserTableName, columnName: string) {
		await this.manager.query(deleteColumnQuery(dataStoreId, columnName));
	}

	async shiftColumns(rawDataStoreId: string, lowestIndex: number, delta: -1 | 1) {
		await this.createQueryBuilder()
			.update()
			.set({
				columnIndex: () => `columnIndex + ${delta}`,
			})
			.where('dataStoreId = :dataStoreId AND columnIndex >= :thresholdValue', {
				dataStoreId: rawDataStoreId,
				thresholdValue: lowestIndex,
			})
			.execute();
	}
}
