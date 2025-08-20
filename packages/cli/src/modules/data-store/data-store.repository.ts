import {
	DATA_STORE_COLUMN_REGEX,
	type DataStoreCreateColumnSchema,
	type ListDataStoreQueryDto,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { DataStoreColumn } from './data-store-column.entity';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStore } from './data-store.entity';
import { toTableName } from './utils/sql-utils';

@Service()
export class DataStoreRepository extends Repository<DataStore> {
	constructor(
		dataSource: DataSource,
		private dataStoreRowsRepository: DataStoreRowsRepository,
	) {
		super(DataStore, dataSource.manager);
	}

	async createDataStore(projectId: string, name: string, columns: DataStoreCreateColumnSchema[]) {
		if (columns.some((c) => !DATA_STORE_COLUMN_REGEX.test(c.name))) {
			throw new UnexpectedError('bad column name');
		}

		let dataStoreId: string | undefined;
		await this.manager.transaction(async (em) => {
			const dataStore = em.create(DataStore, { name, columns, projectId });
			await em.insert(DataStore, dataStore);
			dataStoreId = dataStore.id;

			const tableName = toTableName(dataStore.id);
			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			// insert columns
			const columnEntities = columns.map((col, index) =>
				em.create(DataStoreColumn, {
					name: col.name,
					type: col.type,
					dataStoreId: dataStore.id,
					index: col.index ?? index,
				}),
			);

			if (columnEntities.length > 0) {
				await em.insert(DataStoreColumn, columnEntities);
			}

			// create user table (will create empty table with just id column if no columns)
			await this.dataStoreRowsRepository.createTableWithColumns(
				tableName,
				columnEntities,
				queryRunner,
			);
		});

		if (!dataStoreId) {
			throw new UnexpectedError('Data store creation failed');
		}

		const createdDataStore = await this.findOneOrFail({
			where: { id: dataStoreId },
			relations: ['project', 'columns'],
		});

		return createdDataStore;
	}

	async deleteDataStore(dataStoreId: string, entityManager?: EntityManager) {
		const executor = entityManager ?? this.manager;
		return await executor.transaction(async (em) => {
			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			await em.delete(DataStore, { id: dataStoreId });
			await queryRunner.dropTable(toTableName(dataStoreId), true);

			return true;
		});
	}

	async deleteDataStoreByProjectId(projectId: string) {
		return await this.manager.transaction(async (em) => {
			const existingTables = await em.findBy(DataStore, { projectId });

			let changed = false;
			for (const match of existingTables) {
				const result = await this.deleteDataStore(match.id, em);
				changed = changed || result;
			}

			return changed;
		});
	}

	async deleteDataStoreAll() {
		return await this.manager.transaction(async (em) => {
			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			const existingTables = await em.findBy(DataStore, {});

			let changed = false;
			for (const match of existingTables) {
				const result = await em.delete(DataStore, { id: match.id });
				await queryRunner.dropTable(toTableName(match.id), true);
				changed = changed || (result.affected ?? 0) > 0;
			}

			return changed;
		});
	}

	async getManyAndCount(options: Partial<ListDataStoreQueryDto>) {
		const query = this.getManyQuery(options);
		const [data, count] = await query.getManyAndCount();
		return { count, data };
	}

	async getMany(options: Partial<ListDataStoreQueryDto>) {
		const query = this.getManyQuery(options);
		return await query.getMany();
	}

	private getManyQuery(options: Partial<ListDataStoreQueryDto>): SelectQueryBuilder<DataStore> {
		const query = this.createQueryBuilder('dataStore');

		this.applySelections(query);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(query: SelectQueryBuilder<DataStore>): void {
		this.applyDefaultSelect(query);
	}

	private applyFilters(
		query: SelectQueryBuilder<DataStore>,
		filter: Partial<ListDataStoreQueryDto>['filter'],
	): void {
		for (const x of ['id', 'projectId'] as const) {
			const content = [filter?.[x]].flat().filter((x) => x !== undefined);
			if (content.length === 0) continue;

			query.andWhere(`dataStore.${x} IN (:...${x}s)`, {
				/*
				 * If list is empty, add a dummy value to prevent an error
				 * when using the IN operator with an empty array.
				 */
				[x + 's']: content.length > 0 ? content : [''],
			});
		}

		if (filter?.name) {
			const nameFilters = typeof filter.name === 'string' ? [filter.name] : filter.name;
			for (const name of nameFilters) {
				query.andWhere('LOWER(dataStore.name) LIKE LOWER(:name)', {
					name: `%${name}%`,
				});
			}
		}
	}

	private applySorting(query: SelectQueryBuilder<DataStore>, sortBy?: string): void {
		if (!sortBy) {
			query.orderBy('dataStore.updatedAt', 'DESC');
			return;
		}

		const [field, order] = this.parseSortingParams(sortBy);
		this.applySortingByField(query, field, order);
	}

	private parseSortingParams(sortBy: string): [string, 'DESC' | 'ASC'] {
		const [field, order] = sortBy.split(':');
		return [field, order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'];
	}

	private applySortingByField(
		query: SelectQueryBuilder<DataStore>,
		field: string,
		direction: 'DESC' | 'ASC',
	): void {
		if (field === 'name') {
			query
				.addSelect('LOWER(dataStore.name)', 'datastore_name_lower')
				.orderBy('datastore_name_lower', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`dataStore.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<DataStore>,
		options: Partial<ListDataStoreQueryDto>,
	): void {
		query.skip(options.skip ?? 0);
		if (options?.take) {
			query.skip(options.skip ?? 0).take(options.take);
		}
	}

	private applyDefaultSelect(query: SelectQueryBuilder<DataStore>): void {
		query
			.leftJoinAndSelect('dataStore.project', 'project')
			.leftJoinAndSelect('dataStore.columns', 'data_store_column')
			.select([
				'dataStore',
				...this.getDataStoreColumnFields('data_store_column'),
				...this.getProjectFields('project'),
			]);
	}

	private getDataStoreColumnFields(alias: string): string[] {
		return [
			`${alias}.id`,
			`${alias}.name`,
			`${alias}.type`,
			`${alias}.createdAt`,
			`${alias}.updatedAt`,
			`${alias}.index`,
		];
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}
}
