import type { ListDataStoreContentQueryDto, ListDataStoreContentFilter } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { CreateTable, DslColumn } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, DataSourceOptions, QueryRunner, SelectQueryBuilder, In } from '@n8n/typeorm';
import {
	DataStoreColumnJsType,
	DataStoreRows,
	DataStoreRowWithId,
	UnexpectedError,
} from 'n8n-workflow';

import { DataStoreColumn } from './data-store-column.entity';
import { DataStoreUserTableName } from './data-store.types';
import {
	addColumnQuery,
	deleteColumnQuery,
	extractInsertedIds,
	extractReturningData,
	getPlaceholder,
	normalizeRows,
	normalizeValue,
	quoteIdentifier,
	splitRowsByExistence,
	toDslColumns,
} from './utils/sql-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = SelectQueryBuilder<any>;

function getConditionAndParams(
	filter: ListDataStoreContentFilter['filters'][number],
	index: number,
	dbType: DataSourceOptions['type'],
): [string, Record<string, unknown>] {
	const paramName = `filter_${index}`;
	const column = `${quoteIdentifier('dataStore', dbType)}.${quoteIdentifier(filter.columnName, dbType)}`;

	switch (filter.condition) {
		case 'eq':
			return [`${column} = :${paramName}`, { [paramName]: filter.value }];
		case 'neq':
			return [`${column} != :${paramName}`, { [paramName]: filter.value }];
	}
}

@Service()
export class DataStoreRowsRepository {
	constructor(
		private dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	toTableName(dataStoreId: string): DataStoreUserTableName {
		const { tablePrefix } = this.globalConfig.database;
		return `${tablePrefix}data_store_user_${dataStoreId}`;
	}

	async insertRows(
		dataStoreId: string,
		rows: DataStoreRows,
		columns: DataStoreColumn[],
		returnData: boolean = false,
	) {
		const inserted: DataStoreRowWithId[] = [];
		const dbType = this.dataSource.options.type;
		const useReturning = dbType === 'postgres' || dbType === 'mariadb';

		const table = this.toTableName(dataStoreId);
		const columnNames = columns.map((c) => c.name);
		const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
		const selectColumns = ['id', ...escapedColumns];

		// We insert one by one as the default behavior of returning the last inserted ID
		// is consistent, whereas getting all inserted IDs when inserting multiple values is
		// surprisingly awkward without Entities, e.g. `RETURNING id` explicitly does not aggregate
		// and the `identifiers` array output of `execute()` is empty
		for (const row of rows) {
			for (const column of columns) {
				row[column.name] = normalizeValue(row[column.name], column.type, dbType);
			}

			const query = this.dataSource
				.createQueryBuilder()
				.insert()
				.into(table, columnNames)
				.values(row);

			if (useReturning) {
				query.returning(returnData ? selectColumns.join(',') : 'id');
			}

			const result = await query.execute();

			if (useReturning) {
				const returned = normalizeRows(extractReturningData(result.raw), columns);
				inserted.push.apply(inserted, returned);
				continue;
			}

			// Engines without RETURNING support
			const ids = extractInsertedIds(result.raw, dbType);
			if (ids.length === 0) {
				throw new UnexpectedError("Couldn't find the inserted row ID");
			}

			if (!returnData) {
				inserted.push(...ids.map((id) => ({ id })));
				continue;
			}

			const insertedRows = (await this.getManyByIds(
				dataStoreId,
				ids,
				columns,
			)) as DataStoreRowWithId[];

			inserted.push(...insertedRows);
		}

		return inserted;
	}

	async updateRow(
		dataStoreId: string,
		setData: Record<string, DataStoreColumnJsType | null>,
		whereData: Record<string, DataStoreColumnJsType | null>,
		columns: DataStoreColumn[],
		returnData: boolean = false,
	) {
		const dbType = this.dataSource.options.type;
		const useReturning = dbType === 'postgres';

		const table = this.toTableName(dataStoreId);
		const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
		const selectColumns = ['id', ...escapedColumns];

		for (const column of columns) {
			if (column.name in setData) {
				setData[column.name] = normalizeValue(setData[column.name], column.type, dbType);
			}
			if (column.name in whereData) {
				whereData[column.name] = normalizeValue(whereData[column.name], column.type, dbType);
			}
		}

		let affectedRows: DataStoreRowWithId[] = [];
		if (!useReturning && returnData) {
			// Only Postgres supports RETURNING statement on updates (with our typeorm),
			// on other engines we must query the list of updates rows later by ID
			affectedRows = await this.dataSource
				.createQueryBuilder()
				.select('id')
				.from(table, 'dataStore')
				.where(whereData)
				.getRawMany<{ id: number }>();
		}

		setData.updatedAt = normalizeValue(new Date(), 'date', dbType);

		const query = this.dataSource.createQueryBuilder().update(table).set(setData).where(whereData);

		if (useReturning && returnData) {
			query.returning(selectColumns.join(','));
		}

		const result = await query.execute();

		if (!returnData) {
			return true;
		}

		if (useReturning) {
			return extractReturningData(result.raw);
		}

		const ids = affectedRows.map((row) => row.id);
		return await this.getManyByIds(dataStoreId, ids, columns);
	}

	// TypeORM cannot infer the columns for a dynamic table name, so we use a raw query
	async upsertRows(
		dataStoreId: string,
		matchFields: string[],
		rows: DataStoreRows,
		columns: DataStoreColumn[],
		returnData = false,
	) {
		const { rowsToInsert, rowsToUpdate } = await this.fetchAndSplitRowsByExistence(
			dataStoreId,
			matchFields,
			rows,
		);

		const output: DataStoreRowWithId[] = [];

		if (rowsToInsert.length > 0) {
			const result = await this.insertRows(dataStoreId, rowsToInsert, columns, returnData);
			if (returnData) {
				output.push.apply(output, result);
			}
		}

		if (rowsToUpdate.length > 0) {
			for (const row of rowsToUpdate) {
				const updateKeys = Object.keys(row).filter((key) => !matchFields.includes(key));
				if (updateKeys.length === 0) {
					return true;
				}

				const setData = Object.fromEntries(updateKeys.map((key) => [key, row[key]]));
				const whereData = Object.fromEntries(matchFields.map((key) => [key, row[key]]));

				const result = await this.updateRow(dataStoreId, setData, whereData, columns, returnData);
				if (returnData) {
					output.push.apply(output, result);
				}
			}
		}

		return returnData ? output : true;
	}

	async deleteRows(dataStoreId: string, ids: number[]) {
		if (ids.length === 0) {
			return true;
		}

		const dbType = this.dataSource.options.type;
		const quotedTableName = quoteIdentifier(this.toTableName(dataStoreId), dbType);
		const placeholders = ids.map((_, index) => getPlaceholder(index + 1, dbType)).join(', ');
		const query = `DELETE FROM ${quotedTableName} WHERE id IN (${placeholders})`;

		await this.dataSource.query(query, ids);
		return true;
	}

	async createTableWithColumns(
		dataStoreId: string,
		columns: DataStoreColumn[],
		queryRunner: QueryRunner,
	) {
		const dslColumns = [new DslColumn('id').int.autoGenerate2.primary, ...toDslColumns(columns)];
		const createTable = new CreateTable(this.toTableName(dataStoreId), '', queryRunner).withColumns(
			...dslColumns,
		).withTimestamps;

		await createTable.execute(queryRunner);
	}

	async dropTable(dataStoreId: string, queryRunner: QueryRunner) {
		await queryRunner.dropTable(this.toTableName(dataStoreId), true);
	}

	async addColumn(
		dataStoreId: string,
		column: DataStoreColumn,
		queryRunner: QueryRunner,
		dbType: DataSourceOptions['type'],
	) {
		await queryRunner.query(addColumnQuery(this.toTableName(dataStoreId), column, dbType));
	}

	async dropColumnFromTable(
		dataStoreId: string,
		columnName: string,
		queryRunner: QueryRunner,
		dbType: DataSourceOptions['type'],
	) {
		await queryRunner.query(deleteColumnQuery(this.toTableName(dataStoreId), columnName, dbType));
	}

	async getManyAndCount(dataStoreId: string, dto: ListDataStoreContentQueryDto) {
		const [countQuery, query] = this.getManyQuery(dataStoreId, dto);
		const data: DataStoreRows = await query.select('*').getRawMany();
		const countResult = await countQuery.select('COUNT(*) as count').getRawOne<{
			count: number | string | null;
		}>();
		const count =
			typeof countResult?.count === 'number' ? countResult.count : Number(countResult?.count) || 0;
		return { count: count ?? -1, data };
	}

	async getManyByIds(dataStoreId: string, ids: number[], columns: DataStoreColumn[]) {
		const table = this.toTableName(dataStoreId);
		const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
		const selectColumns = ['id', ...escapedColumns];

		if (ids.length === 0) {
			return [];
		}

		const updatedRows = await this.dataSource
			.createQueryBuilder()
			.select(selectColumns)
			.from(table, 'dataStore')
			.where({ id: In(ids) })
			.getRawMany<DataStoreRowWithId>();

		return normalizeRows(updatedRows, columns);
	}

	async getRowIds(dataStoreId: string, dto: ListDataStoreContentQueryDto) {
		const [_, query] = this.getManyQuery(dataStoreId, dto);
		const result = await query.select('dataStore.id').getRawMany<number>();
		return result;
	}

	private getManyQuery(
		dataStoreId: string,
		dto: ListDataStoreContentQueryDto,
	): [QueryBuilder, QueryBuilder] {
		const query = this.dataSource.createQueryBuilder();

		query.from(this.toTableName(dataStoreId), 'dataStore');
		this.applyFilters(query, dto);
		const countQuery = query.clone().select('COUNT(*)');
		this.applySorting(query, dto);
		this.applyPagination(query, dto);

		return [countQuery, query];
	}

	private applyFilters(query: QueryBuilder, dto: ListDataStoreContentQueryDto): void {
		const filters = dto.filter?.filters ?? [];
		const filterType = dto.filter?.type ?? 'and';

		const dbType = this.dataSource.options.type;
		const conditionsAndParams = filters.map((filter, i) =>
			getConditionAndParams(filter, i, dbType),
		);

		for (const [condition, params] of conditionsAndParams) {
			if (filterType === 'or') {
				query.orWhere(condition, params);
			} else {
				query.andWhere(condition, params);
			}
		}
	}

	private applySorting(query: QueryBuilder, dto: ListDataStoreContentQueryDto): void {
		if (!dto.sortBy) {
			return;
		}

		const [field, order] = dto.sortBy;
		this.applySortingByField(query, field, order);
	}

	private applySortingByField(query: QueryBuilder, field: string, direction: 'DESC' | 'ASC'): void {
		const dbType = this.dataSource.options.type;
		const quotedField = `${quoteIdentifier('dataStore', dbType)}.${quoteIdentifier(field, dbType)}`;
		query.orderBy(quotedField, direction);
	}

	private applyPagination(query: QueryBuilder, dto: ListDataStoreContentQueryDto): void {
		query.skip(dto.skip);
		query.take(dto.take);
	}

	private async fetchAndSplitRowsByExistence(
		dataStoreId: string,
		matchFields: string[],
		rows: DataStoreRows,
	): Promise<{ rowsToInsert: DataStoreRows; rowsToUpdate: DataStoreRows }> {
		const queryBuilder = this.dataSource
			.createQueryBuilder()
			.select(matchFields)
			.from(this.toTableName(dataStoreId), 'datastore');

		rows.forEach((row, index) => {
			const matchData = Object.fromEntries(matchFields.map((field) => [field, row[field]]));
			if (index === 0) {
				queryBuilder.where(matchData);
			} else {
				queryBuilder.orWhere(matchData);
			}
		});

		const existing: Array<Record<string, DataStoreColumnJsType>> = await queryBuilder.getRawMany();

		return splitRowsByExistence(existing, matchFields, rows);
	}
}
