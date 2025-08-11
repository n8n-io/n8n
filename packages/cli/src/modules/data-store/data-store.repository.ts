import {
	DATA_STORE_COLUMN_REGEX,
	type DataStoreCreateColumnSchema,
	type ListDataStoreQueryDto,
} from '@n8n/api-types';
import { DslColumn, CreateTable } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { DataStoreColumnEntity } from './data-store-column.entity';
import { DataStoreEntity } from './data-store.entity';
import { createUserTableQuery, toDslColumns, toTableName } from './utils/sql-utils';

@Service()
export class DataStoreRepository extends Repository<DataStoreEntity> {
	constructor(dataSource: DataSource) {
		super(DataStoreEntity, dataSource.manager);
	}

	// TODO: remove
	async createUserTableRaw(
		projectId: string,
		name: string,
		columns: DataStoreCreateColumnSchema[],
	) {
		return await this.manager.transaction(async (em) => {
			const dataStore = em.create(DataStoreEntity, { name, columns, projectId });
			await em.insert(DataStoreEntity, dataStore);
			const dbType = em.connection.options.type;
			await em.query(createUserTableQuery(toTableName(dataStore.id), columns, dbType));
			return dataStore;
		});
	}

	async createUserTable(projectId: string, name: string, columns: DataStoreCreateColumnSchema[]) {
		if (columns.some((c) => !DATA_STORE_COLUMN_REGEX.test(c.name))) {
			throw new UnexpectedError('bad column name');
		}

		return await this.manager.transaction(async (em) => {
			const dataStore = em.create(DataStoreEntity, { name, columns, projectId });
			await em.insert(DataStoreEntity, dataStore);

			const tableName = toTableName(dataStore.id);
			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			if (columns.length === 0) {
				return dataStore;
			}

			// insert columns
			const columnEntities = columns.map((col, index) =>
				em.create(DataStoreColumnEntity, {
					name: col.name,
					type: col.type,
					dataStoreId: dataStore.id,
					index: col.index ?? index,
				}),
			);
			await em.insert(DataStoreColumnEntity, columnEntities);

			// create user table
			const dslColumns = [new DslColumn('id').int.autoGenerate2.primary, ...toDslColumns(columns)];

			const createTable = new CreateTable(tableName, '', queryRunner);
			createTable.withColumns.apply(createTable, dslColumns);
			await createTable.execute(queryRunner);

			return dataStore;
		});
	}

	async deleteUserTable(dataStoreId: string, entityManager?: EntityManager) {
		const executor = entityManager ?? this.manager;
		return await executor.transaction(async (em) => {
			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			await em.delete(DataStoreEntity, { id: dataStoreId });
			await queryRunner.dropTable(toTableName(dataStoreId), true);

			return true;
		});
	}

	async deleteDataStoreByProjectId(projectId: string) {
		return await this.manager.transaction(async (em) => {
			const existingTables = await em.findBy(DataStoreEntity, { projectId });

			let changed = false;
			for (const match of existingTables) {
				const result = await this.deleteUserTable(match.id, em);
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

			const existingTables = await em.findBy(DataStoreEntity, {});

			let changed = false;
			for (const match of existingTables) {
				const result = await em.delete(DataStoreEntity, { id: match.id });
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

	private getManyQuery(
		options: Partial<ListDataStoreQueryDto>,
	): SelectQueryBuilder<DataStoreEntity> {
		const query = this.createQueryBuilder('dataStore');

		this.applySelections(query);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(query: SelectQueryBuilder<DataStoreEntity>): void {
		this.applyDefaultSelect(query);
	}

	private applyFilters(
		query: SelectQueryBuilder<DataStoreEntity>,
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

		if (filter?.name && typeof filter.name === 'string') {
			query.andWhere('LOWER(dataStore.name) LIKE LOWER(:name)', {
				name: `%${filter.name}%`,
			});
		}
	}

	private applySorting(query: SelectQueryBuilder<DataStoreEntity>, sortBy?: string): void {
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
		query: SelectQueryBuilder<DataStoreEntity>,
		field: string,
		direction: 'DESC' | 'ASC',
	): void {
		if (field === 'name') {
			query.orderBy('LOWER(dataStore.name)', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`dataStore.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<DataStoreEntity>,
		options: Partial<ListDataStoreQueryDto>,
	): void {
		query.skip(options.skip ?? 0);
		if (options?.take) {
			query.skip(options.skip ?? 0).take(options.take);
		}
	}

	private applyDefaultSelect(query: SelectQueryBuilder<DataStoreEntity>): void {
		query
			.leftJoinAndSelect('dataStore.project', 'project')
			.leftJoinAndSelect('dataStore.columns', 'data_store_column_entity')
			.select([
				'dataStore',
				...this.getDataStoreColumnFields('data_store_column_entity'),
				...this.getProjectFields('project'),
			])
			.addOrderBy('data_store_column_entity.index', 'ASC');
	}

	private getDataStoreColumnFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`];
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}
}
