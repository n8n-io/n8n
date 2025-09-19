import {
	DATA_STORE_COLUMN_REGEX,
	type DataStoreCreateColumnSchema,
	type ListDataStoreQueryDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreUserTableName, DataTablesSizeData } from './data-store.types';
import { DataTableColumn } from './data-table-column.entity';
import { DataTable } from './data-table.entity';
import { toTableId, toTableName } from './utils/sql-utils';

@Service()
export class DataStoreRepository extends Repository<DataTable> {
	constructor(
		dataSource: DataSource,
		private dataStoreRowsRepository: DataStoreRowsRepository,
		private readonly globalConfig: GlobalConfig,
	) {
		super(DataTable, dataSource.manager);
	}

	async createDataStore(projectId: string, name: string, columns: DataStoreCreateColumnSchema[]) {
		if (columns.some((c) => !DATA_STORE_COLUMN_REGEX.test(c.name))) {
			throw new UnexpectedError('bad column name');
		}

		let dataTableId: string | undefined;
		await this.manager.transaction(async (em) => {
			const dataStore = em.create(DataTable, { name, columns, projectId });
			// @ts-ignore Workaround for intermittent typecheck issue with _QueryDeepPartialEntity
			await em.insert(DataTable, dataStore);
			dataTableId = dataStore.id;

			const queryRunner = em.queryRunner;
			if (!queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			// insert columns
			const columnEntities = columns.map((col, index) =>
				em.create(DataTableColumn, {
					dataTableId,
					name: col.name,
					type: col.type,
					index: col.index ?? index,
				}),
			);

			if (columnEntities.length > 0) {
				// @ts-ignore Workaround for intermittent typecheck issue with _QueryDeepPartialEntity
				await em.insert(DataTableColumn, columnEntities);
			}

			// create user table (will create empty table with just id column if no columns)
			await this.dataStoreRowsRepository.createTableWithColumns(
				dataTableId,
				columnEntities,
				queryRunner,
			);
		});

		if (!dataTableId) {
			throw new UnexpectedError('Data store creation failed');
		}

		const createdDataStore = await this.findOneOrFail({
			where: { id: dataTableId },
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

			await em.delete(DataTable, { id: dataStoreId });
			await this.dataStoreRowsRepository.dropTable(dataStoreId, queryRunner);

			return true;
		});
	}

	async deleteDataStoreByProjectId(projectId: string) {
		return await this.manager.transaction(async (em) => {
			const existingTables = await em.findBy(DataTable, { projectId });

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

			const existingTables = await em.findBy(DataTable, {});

			let changed = false;
			for (const match of existingTables) {
				const result = await em.delete(DataTable, { id: match.id });
				await this.dataStoreRowsRepository.dropTable(match.id, queryRunner);
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

	private getManyQuery(options: Partial<ListDataStoreQueryDto>): SelectQueryBuilder<DataTable> {
		const query = this.createQueryBuilder('dataStore');

		this.applySelections(query);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(query: SelectQueryBuilder<DataTable>): void {
		this.applyDefaultSelect(query);
	}

	private applyFilters(
		query: SelectQueryBuilder<DataTable>,
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

	private applySorting(query: SelectQueryBuilder<DataTable>, sortBy?: string): void {
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
		query: SelectQueryBuilder<DataTable>,
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
		query: SelectQueryBuilder<DataTable>,
		options: Partial<ListDataStoreQueryDto>,
	): void {
		query.skip(options.skip ?? 0);
		if (query.take) query.take(options.take);
	}

	private applyDefaultSelect(query: SelectQueryBuilder<DataTable>): void {
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

	private parseSize = (bytes: number | string | null): number =>
		bytes === null ? 0 : typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;

	async findDataTablesSize(): Promise<DataTablesSizeData> {
		const dbType = this.globalConfig.database.type;
		const tablePattern = toTableName('%');

		let sql = '';

		switch (dbType) {
			case 'sqlite':
				sql = `
        SELECT name AS table_name, SUM(pgsize) AS table_bytes
         FROM dbstat
        WHERE name LIKE '${tablePattern}'
        GROUP BY name
      `;
				break;

			case 'postgresdb': {
				const schemaName = this.globalConfig.database.postgresdb?.schema;
				sql = `
        SELECT c.relname AS table_name, pg_relation_size(c.oid) AS table_bytes
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = '${schemaName}'
           AND c.relname LIKE '${tablePattern}'
           AND c.relkind IN ('r', 'm', 'p')
      `;
				break;
			}

			case 'mysqldb':
			case 'mariadb': {
				const databaseName = this.globalConfig.database.mysqldb.database;
				const isMariaDb = dbType === 'mariadb';
				const innodbTables = isMariaDb ? 'INNODB_SYS_TABLES' : 'INNODB_TABLES';
				const innodbTablespaces = isMariaDb ? 'INNODB_SYS_TABLESPACES' : 'INNODB_TABLESPACES';
				sql = `
        SELECT t.TABLE_NAME AS table_name,
            COALESCE(
                (
                  SELECT SUM(ists.ALLOCATED_SIZE)
                    FROM information_schema.${innodbTables} ist
                    JOIN information_schema.${innodbTablespaces} ists
                      ON ists.SPACE = ist.SPACE
                   WHERE ist.NAME = CONCAT(t.TABLE_SCHEMA, '/', t.TABLE_NAME)
                ),
                (t.DATA_LENGTH + t.INDEX_LENGTH)
            ) AS table_bytes
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = '${databaseName}'
          AND t.TABLE_NAME LIKE '${tablePattern}'
    `;
				break;
			}

			default:
				return { totalBytes: 0, dataTables: {} };
		}

		const result = (await this.query(sql)) as Array<{
			table_name: string;
			table_bytes: number | string | null;
		}>;

		return result
			.filter((row) => row.table_bytes !== null && row.table_name)
			.reduce(
				(acc, row) => {
					const dataStoreId = toTableId(row.table_name as DataStoreUserTableName);
					const sizeBytes = this.parseSize(row.table_bytes);
					acc.dataTables[dataStoreId] = (acc.dataTables[dataStoreId] ?? 0) + sizeBytes;
					acc.totalBytes += sizeBytes;
					return acc;
				},
				{ dataTables: {} as Record<string, number>, totalBytes: 0 },
			);
	}
}
