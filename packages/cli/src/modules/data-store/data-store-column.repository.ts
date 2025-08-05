import { DataStoreCreateColumnSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { DataStoreColumnEntity } from './data-store-column.entity';
import { addColumnQuery, deleteColumnQuery, toTableName } from './utils/sql-utils';

@Service()
export class DataStoreColumnRepository extends Repository<DataStoreColumnEntity> {
	constructor(dataSource: DataSource) {
		super(DataStoreColumnEntity, dataSource.manager);
	}

	async getColumns(rawDataStoreId: string, em?: EntityManager) {
		const executor = em ?? this.manager;
		return await executor
			.createQueryBuilder(DataStoreColumnEntity, 'dsc')
			.where('dsc.dataStoreId = :dataStoreId', { dataStoreId: rawDataStoreId })
			.getMany();
	}

	async addColumn(dataStoreId: string, schema: DataStoreCreateColumnSchema) {
		return await this.manager.transaction(async (em) => {
			const existingColumnMatch = await em.existsBy(DataStoreColumnEntity, {
				name: schema.name,
				dataStoreId,
			});

			if (existingColumnMatch) {
				throw new UserError(
					`column name '${schema.name}' already taken in data store '${dataStoreId}'`,
				);
			}

			if (schema.columnIndex === undefined) {
				const columns = await this.getColumns(dataStoreId, em);
				schema.columnIndex = columns.length;
			} else {
				await this.shiftColumns(dataStoreId, schema.columnIndex, 1, em);
			}

			const column = em.create(DataStoreColumnEntity, {
				...schema,
				dataStoreId,
			});

			await em.insert(DataStoreColumnEntity, column);
			await em.query(addColumnQuery(toTableName(dataStoreId), column));

			return column;
		});
	}

	async deleteColumn(dataStoreId: string, column: DataStoreColumnEntity) {
		await this.manager.transaction(async (em) => {
			await em.remove(DataStoreColumnEntity, column);
			await em.query(deleteColumnQuery(toTableName(dataStoreId), column.name));
			await this.shiftColumns(dataStoreId, column.columnIndex, -1, em);
		});
	}

	async moveColumn(rawDataStoreId: string, columnId: string, targetIndex: number) {
		await this.manager.transaction(async (em) => {
			const columnCount = await em.countBy(DataStoreColumnEntity, { dataStoreId: rawDataStoreId });

			if (targetIndex >= columnCount) {
				throw new UserError('tried to move column to index larger than column count');
			}

			if (targetIndex < 0) {
				throw new UserError('tried to move column to negative index');
			}

			const existingColumn = await em.findOneBy(DataStoreColumnEntity, {
				id: columnId,
				dataStoreId: rawDataStoreId,
			});

			if (existingColumn === null) {
				throw new UserError(`tried to move column not present in data store '${rawDataStoreId}'`);
			}

			await this.shiftColumns(rawDataStoreId, existingColumn.columnIndex, -1, em);
			await this.shiftColumns(rawDataStoreId, targetIndex, 1, em);
			await em.update(
				DataStoreColumnEntity,
				{ id: existingColumn.id },
				{ columnIndex: targetIndex },
			);
		});
	}

	async shiftColumns(
		rawDataStoreId: string,
		lowestIndex: number,
		delta: -1 | 1,
		em?: EntityManager,
	) {
		const executor = em ?? this.manager;
		await executor
			.createQueryBuilder()
			.update(DataStoreColumnEntity)
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
