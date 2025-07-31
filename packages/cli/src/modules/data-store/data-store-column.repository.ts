import { DataStoreCreateColumnSchema } from '@n8n/api-types/src/schemas/data-store.schema';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { DataStoreColumnEntity } from './data-store-column.entity';
import { DataStoreUserTableName } from './data-store.types';
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

	async deleteColumn(dataStoreId: DataStoreUserTableName, column: string) {
		await this.manager.query(deleteColumnQuery(dataStoreId, column));
	}

	async shiftColumns(dataStoreId: string, lowestIndex: number, delta: -1 | 1) {
		await this.createQueryBuilder()
			.update()
			.set({
				columnIndex: () => `columnIndex + ${delta}`,
			})
			.where('dataStoreId = :dataStoreId AND columnIndex > :thresholdValue', {
				dataStoreId,
				thresholdValue: lowestIndex,
			})
			.execute();
	}
}
