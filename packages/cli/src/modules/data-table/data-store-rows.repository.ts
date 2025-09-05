import type { ListDataStoreContentQueryDto, DataTableFilter } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { CreateTable, DslColumn } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	DataSourceOptions,
	QueryRunner,
	SelectQueryBuilder,
	UpdateQueryBuilder,
	In,
	ObjectLiteral,
} from '@n8n/typeorm';
import {
	DataStoreColumnJsType,
	DataStoreRows,
	DataStoreRowReturn,
	UnexpectedError,
	DataStoreRowsReturn,
	DATA_TABLE_SYSTEM_COLUMNS,
} from 'n8n-workflow';

import { DataStoreUserTableName } from './data-store.types';
import { DataTableColumn } from './data-table-column.entity';
import {
	addColumnQuery,
	deleteColumnQuery,
	escapeLikeSpecials,
	extractInsertedIds,
	extractReturningData,
	normalizeRows,
	normalizeValue,
	quoteIdentifier,
	splitRowsByExistence,
	toDslColumns,
	toSqliteGlobFromPercent,
} from './utils/sql-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = SelectQueryBuilder<any>;

/**
 * Converts filter conditions to SQL WHERE clauses with parameters.
 *
 * LIKE / ILIKE rules:
 * - Only '%' is a wildcard (zero or more chars).
 * - All other special chars ('_', '*', '?', '[', ']') are treated literally.
 * - '_' and '\' are escaped in the value; SQL uses `ESCAPE '\'` so `\_` means literal underscore.
 *
 * Why the crazy backslashes:
 * - Postgres/SQLite/Oracle/SQL Server: `ESCAPE '\'` is written as-is.
 * - MySQL/MariaDB: the SQL literal itself requires two backslashes (`'\\'`) to mean one.
 */
function getConditionAndParams(
	filter: DataTableFilter['filters'][number],
	index: number,
	dbType: DataSourceOptions['type'],
	tableReference?: string,
	columns?: DataTableColumn[],
): [string, Record<string, unknown>] {
	const paramName = `filter_${index}`;
	const columnRef = tableReference
		? `${quoteIdentifier(tableReference, dbType)}.${quoteIdentifier(filter.columnName, dbType)}`
		: quoteIdentifier(filter.columnName, dbType);

	if (filter.value === null) {
		switch (filter.condition) {
			case 'eq':
				return [`${columnRef} IS NULL`, {}];
			case 'neq':
				return [`${columnRef} IS NOT NULL`, {}];
		}
	}

	// Find the column type to normalize the value consistently
	const columnInfo = columns?.find((col) => col.name === filter.columnName);
	const value = columnInfo ? normalizeValue(filter.value, columnInfo?.type, dbType) : filter.value;

	// Handle operators that map directly to SQL operators
	const operators: Record<string, string> = {
		eq: '=',
		neq: '!=',
		gt: '>',
		gte: '>=',
		lt: '<',
		lte: '<=',
	};

	if (operators[filter.condition]) {
		return [`${columnRef} ${operators[filter.condition]} :${paramName}`, { [paramName]: value }];
	}

	switch (filter.condition) {
		// case-sensitive
		case 'like':
			if (['sqlite', 'sqlite-pooled'].includes(dbType)) {
				const globValue = toSqliteGlobFromPercent(value as string);
				return [`${columnRef} GLOB :${paramName}`, { [paramName]: globValue }];
			}

			if (['mysql', 'mariadb'].includes(dbType)) {
				const escapedValue = escapeLikeSpecials(value as string);
				return [
					`${columnRef} LIKE BINARY :${paramName} ESCAPE '\\\\'`,
					{ [paramName]: escapedValue },
				];
			}

			// PostgreSQL: LIKE is case-sensitive
			if (dbType === 'postgres') {
				const escapedValue = escapeLikeSpecials(value as string);
				return [`${columnRef} LIKE :${paramName} ESCAPE '\\'`, { [paramName]: escapedValue }];
			}

			// Generic fallback
			return [`${columnRef} LIKE :${paramName}`, { [paramName]: value }];

		// case-insensitive
		case 'ilike':
			if (['sqlite', 'sqlite-pooled'].includes(dbType)) {
				const escapedValue = escapeLikeSpecials(value as string);
				return [
					`UPPER(${columnRef}) LIKE UPPER(:${paramName}) ESCAPE '\\'`,
					{ [paramName]: escapedValue },
				];
			}

			if (['mysql', 'mariadb'].includes(dbType)) {
				const escapedValue = escapeLikeSpecials(value as string);
				return [
					`UPPER(${columnRef}) LIKE UPPER(:${paramName}) ESCAPE '\\\\'`,
					{ [paramName]: escapedValue },
				];
			}

			if (dbType === 'postgres') {
				const escapedValue = escapeLikeSpecials(value as string);
				return [`${columnRef} ILIKE :${paramName} ESCAPE '\\'`, { [paramName]: escapedValue }];
			}

			return [`UPPER(${columnRef}) LIKE UPPER(:${paramName})`, { [paramName]: value }];
	}

	// This should never happen as all valid conditions are handled above
	throw new Error(`Unsupported filter condition: ${filter.condition}`);
}

@Service()
export class DataStoreRowsRepository {
	constructor(
		private dataSource: DataSource,
		private readonly globalConfig: GlobalConfig,
	) {}

	toTableName(dataStoreId: string): DataStoreUserTableName {
		const { tablePrefix } = this.globalConfig.database;
		return `${tablePrefix}data_table_user_${dataStoreId}`;
	}

	async insertRows<T extends boolean | undefined>(
		dataStoreId: string,
		rows: DataStoreRows,
		columns: DataTableColumn[],
		returnData?: T,
	): Promise<Array<T extends true ? DataStoreRowReturn : Pick<DataStoreRowReturn, 'id'>>>;
	async insertRows(
		dataStoreId: string,
		rows: DataStoreRows,
		columns: DataTableColumn[],
		returnData?: boolean,
	): Promise<Array<DataStoreRowReturn | Pick<DataStoreRowReturn, 'id'>>> {
		const inserted: Array<Pick<DataStoreRowReturn, 'id'>> = [];
		const dbType = this.dataSource.options.type;
		const useReturning = dbType === 'postgres' || dbType === 'mariadb';

		const table = this.toTableName(dataStoreId);
		const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
		const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
			this.dataSource.driver.escape(x),
		);
		const selectColumns = [...escapedSystemColumns, ...escapedColumns];

		// We insert one by one as the default behavior of returning the last inserted ID
		// is consistent, whereas getting all inserted IDs when inserting multiple values is
		// surprisingly awkward without Entities, e.g. `RETURNING id` explicitly does not aggregate
		// and the `identifiers` array output of `execute()` is empty
		for (const row of rows) {
			// Fill missing columns with null values to support partial data insertion
			const completeRow = { ...row };
			for (const column of columns) {
				if (!(column.name in completeRow)) {
					completeRow[column.name] = null;
				}
				completeRow[column.name] = normalizeValue(completeRow[column.name], column.type, dbType);
			}

			const query = this.dataSource.createQueryBuilder().insert().into(table).values(completeRow);

			if (useReturning) {
				query.returning(returnData ? selectColumns.join(',') : 'id');
			}

			const result = await query.execute();

			if (useReturning) {
				const returned = returnData
					? normalizeRows(extractReturningData(result.raw), columns)
					: extractInsertedIds(result.raw, dbType).map((id) => ({ id }));
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

			const insertedRows = await this.getManyByIds(dataStoreId, ids, columns);

			inserted.push(...insertedRows);
		}

		return inserted;
	}

	async updateRow(
		dataStoreId: string,
		setData: Record<string, DataStoreColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		returnData: boolean = false,
	) {
		const dbType = this.dataSource.options.type;
		const useReturning = dbType === 'postgres';

		const table = this.toTableName(dataStoreId);
		const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
		const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
			this.dataSource.driver.escape(x),
		);
		const selectColumns = [...escapedSystemColumns, ...escapedColumns];

		for (const column of columns) {
			if (column.name in setData) {
				setData[column.name] = normalizeValue(setData[column.name], column.type, dbType);
			}
		}

		let affectedRows: Array<Pick<DataStoreRowReturn, 'id'>> = [];
		if (!useReturning && returnData) {
			// Only Postgres supports RETURNING statement on updates (with our typeorm),
			// on other engines we must query the list of updates rows later by ID
			const selectQuery = this.dataSource
				.createQueryBuilder()
				.select('id')
				.from(table, 'dataTable');
			this.applyFilters(selectQuery, filter, 'dataTable', columns);
			affectedRows = await selectQuery.getRawMany<{ id: number }>();
		}

		setData.updatedAt = normalizeValue(new Date(), 'date', dbType);

		const query = this.dataSource.createQueryBuilder().update(table);
		// Some DBs (like SQLite) don't allow using table aliases as column prefixes in UPDATE statements
		this.applyFilters(query, filter, undefined, columns);
		query.set(setData);

		if (useReturning && returnData) {
			query.returning(selectColumns.join(','));
		}

		const result = await query.execute();

		if (!returnData) {
			return true;
		}

		if (useReturning) {
			return normalizeRows(extractReturningData(result.raw), columns);
		}

		const ids = affectedRows.map((row) => row.id);
		return await this.getManyByIds(dataStoreId, ids, columns);
	}

	// TypeORM cannot infer the columns for a dynamic table name, so we use a raw query
	async upsertRows<T extends boolean | undefined>(
		dataStoreId: string,
		matchFields: string[],
		rows: DataStoreRows,
		columns: DataTableColumn[],
		returnData?: T,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async upsertRows(
		dataStoreId: string,
		matchFields: string[],
		rows: DataStoreRows,
		columns: DataTableColumn[],
		returnData?: boolean,
	) {
		returnData = returnData ?? false;
		const { rowsToInsert, rowsToUpdate } = await this.fetchAndSplitRowsByExistence(
			dataStoreId,
			matchFields,
			rows,
		);

		const output: DataStoreRowReturn[] = [];

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

				// Convert whereData object to DataTableFilter format
				const filter: DataTableFilter = {
					type: 'and',
					filters: Object.entries(whereData).map(([columnName, value]) => ({
						columnName,
						condition: 'eq' as const,
						value,
					})),
				};
				const result = await this.updateRow(dataStoreId, setData, filter, columns, returnData);
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

		const table = this.toTableName(dataStoreId);

		await this.dataSource
			.createQueryBuilder()
			.delete()
			.from(table, 'dataTable')
			.where({ id: In(ids) })
			.execute();

		return true;
	}

	async createTableWithColumns(
		dataStoreId: string,
		columns: DataTableColumn[],
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
		column: DataTableColumn,
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

	async getManyAndCount(
		dataStoreId: string,
		dto: ListDataStoreContentQueryDto,
		columns?: DataTableColumn[],
	) {
		const [countQuery, query] = this.getManyQuery(dataStoreId, dto, columns);
		const data: DataStoreRowsReturn = await query.select('*').getRawMany();
		const countResult = await countQuery.select('COUNT(*) as count').getRawOne<{
			count: number | string | null;
		}>();
		const count =
			typeof countResult?.count === 'number' ? countResult.count : Number(countResult?.count) || 0;
		return { count: count ?? -1, data };
	}

	async getManyByIds(dataStoreId: string, ids: number[], columns: DataTableColumn[]) {
		const table = this.toTableName(dataStoreId);
		const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
		const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
			this.dataSource.driver.escape(x),
		);
		const selectColumns = [...escapedSystemColumns, ...escapedColumns];

		if (ids.length === 0) {
			return [];
		}

		const updatedRows = await this.dataSource
			.createQueryBuilder()
			.select(selectColumns)
			.from(table, 'dataTable')
			.where({ id: In(ids) })
			.getRawMany<DataStoreRowReturn>();

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
		columns?: DataTableColumn[],
	): [QueryBuilder, QueryBuilder] {
		const query = this.dataSource.createQueryBuilder();

		const tableReference = 'dataTable';
		query.from(this.toTableName(dataStoreId), tableReference);
		if (dto.filter) {
			this.applyFilters(query, dto.filter, tableReference, columns);
		}
		const countQuery = query.clone().select('COUNT(*)');
		this.applySorting(query, dto);
		this.applyPagination(query, dto);

		return [countQuery, query];
	}

	private applyFilters<T extends ObjectLiteral>(
		query: SelectQueryBuilder<T> | UpdateQueryBuilder<T>,
		filter: DataTableFilter,
		tableReference?: string,
		columns?: DataTableColumn[],
	): void {
		const filters = filter.filters ?? [];
		const filterType = filter.type ?? 'and';

		const dbType = this.dataSource.options.type;
		const conditionsAndParams = filters.map((filter, i) =>
			getConditionAndParams(filter, i, dbType, tableReference, columns),
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
		const quotedField = `${quoteIdentifier('dataTable', dbType)}.${quoteIdentifier(field, dbType)}`;
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
			.from(this.toTableName(dataStoreId), 'datatable');

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
