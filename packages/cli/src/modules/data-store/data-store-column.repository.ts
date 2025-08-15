import { DataStoreCreateColumnSchema } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { DataStoreColumn } from './data-store-column.entity';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@Service()
export class DataStoreColumnRepository extends Repository<DataStoreColumn> {
	constructor(
		dataSource: DataSource,
		private dataStoreRowsRepository: DataStoreRowsRepository,
	) {
		super(DataStoreColumn, dataSource.manager);
	}

	async getColumns(rawDataStoreId: string, em?: EntityManager) {
		const executor = em ?? this.manager;
		const columns = await executor
			.createQueryBuilder(DataStoreColumn, 'dsc')
			.where('dsc.dataStoreId = :dataStoreId', { dataStoreId: rawDataStoreId })
			.getMany();

		// Ensure columns are always returned in the correct order by index,
		// since the database does not guarantee ordering and TypeORM does not preserve
		// join order in @OneToMany relations.
		columns.sort((a, b) => a.index - b.index);

		return columns;
	}

	async addColumn(dataStoreId: string, schema: DataStoreCreateColumnSchema) {
		return await this.manager.transaction(async (em) => {
			const existingColumnMatch = await em.existsBy(DataStoreColumn, {
				name: schema.name,
				dataStoreId,
			});

			if (existingColumnMatch) {
				throw new UserError(
					`column name '${schema.name}' already taken in data store '${dataStoreId}'`,
				);
			}

			if (schema.index === undefined) {
				const columns = await this.getColumns(dataStoreId, em);
				schema.index = columns.length;
			} else {
				await this.shiftColumns(dataStoreId, schema.index, 1, em);
			}

			const column = em.create(DataStoreColumn, {
				...schema,
				dataStoreId,
			});

			await em.insert(DataStoreColumn, column);

			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			await this.dataStoreRowsRepository.ensureTableAndAddColumn(
				dataStoreId,
				column,
				queryRunner,
				em.connection.options.type,
			);

			return column;
		});
	}

	async deleteColumn(dataStoreId: string, column: DataStoreColumn) {
		await this.manager.transaction(async (em) => {
			await em.remove(DataStoreColumn, column);
			await this.dataStoreRowsRepository.dropColumnFromTable(
				dataStoreId,
				column.name,
				em,
				em.connection.options.type,
			);
			await this.shiftColumns(dataStoreId, column.index, -1, em);
		});
	}

	async moveColumn(rawDataStoreId: string, columnId: string, targetIndex: number) {
		await this.manager.transaction(async (em) => {
			const existingColumn = await em.findOneBy(DataStoreColumn, {
				id: columnId,
				dataStoreId: rawDataStoreId,
			});

			if (existingColumn === null) {
				throw new NotFoundError(
					`tried to move column not present in data store '${rawDataStoreId}'`,
				);
			}

			const columnCount = await em.countBy(DataStoreColumn, { dataStoreId: rawDataStoreId });

			if (targetIndex >= columnCount) {
				throw new BadRequestError('tried to move column to index larger than column count');
			}

			if (targetIndex < 0) {
				throw new BadRequestError('tried to move column to negative index');
			}

			await this.shiftColumns(rawDataStoreId, existingColumn.index, -1, em);
			await this.shiftColumns(rawDataStoreId, targetIndex, 1, em);
			await em.update(DataStoreColumn, { id: existingColumn.id }, { index: targetIndex });
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
			.update(DataStoreColumn)
			.set({
				index: () => `index + ${delta}`,
			})
			.where('dataStoreId = :dataStoreId AND index >= :thresholdValue', {
				dataStoreId: rawDataStoreId,
				thresholdValue: lowestIndex,
			})
			.execute();
	}
}
