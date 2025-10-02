import { ListDataStoreContentQueryDto, DataTableFilter } from '@n8n/api-types';
import { CreateTable, DslColumn, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	DataSourceOptions,
	SelectQueryBuilder,
	UpdateQueryBuilder,
	In,
	ObjectLiteral,
	EntityManager,
	DeleteQueryBuilder,
} from '@n8n/typeorm';
import {
	DataStoreColumnJsType,
	DataStoreRows,
	DataStoreRowReturn,
	UnexpectedError,
	DataStoreRowsReturn,
	DATA_TABLE_SYSTEM_COLUMNS,
	DataTableInsertRowsReturnType,
	DataTableInsertRowsResult,
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
	toDslColumns,
	toSqliteGlobFromPercent,
	toTableName,
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
		gt: '>',
		gte: '>=',
		lt: '<',
		lte: '<=',
	};

	if (operators[filter.condition]) {
		return [`${columnRef} ${operators[filter.condition]} :${paramName}`, { [paramName]: value }];
	}

	// Special handling for neq to include NULL values (only if value is not null!)
	if (filter.condition === 'neq') {
		return [`(${columnRef} != :${paramName} OR ${columnRef} IS NULL)`, { [paramName]: value }];
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
	constructor(private dataSource: DataSource) {}

	async insertRowsBulk(
		table: DataStoreUserTableName,
		rows: DataStoreRows,
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			let insertedRows = 0;

			// Special case: no columns, insert each row individually
			if (columns.length === 0) {
				for (const row of rows) {
					const query = em.createQueryBuilder().insert().into(table).values(row);
					await query.execute();
					insertedRows++;
				}
				return { success: true, insertedRows } as const;
			}

			// DB systems have different maximum parameters per query
			// with old sqlite versions having the lowest in 999 parameters
			// In practice 20000 works here, but performance didn't meaningfully change
			// so this should be a safe limit
			const batchSize = 800;
			const batches = Math.max(1, Math.ceil((columns.length * rows.length) / batchSize));
			const rowsPerBatch = Math.ceil(rows.length / batches);

			const columnNames = columns.map((x) => x.name);
			const dbType = this.dataSource.options.type;

			for (let i = 0; i < batches; ++i) {
				const start = i * rowsPerBatch;
				const endExclusive = Math.min(rows.length, (i + 1) * rowsPerBatch);

				if (endExclusive <= start) break;

				const completeRows = new Array<DataStoreColumnJsType[]>(endExclusive - start);
				for (let j = start; j < endExclusive; ++j) {
					const insertArray: DataStoreColumnJsType[] = [];

					for (let h = 0; h < columnNames.length; ++h) {
						const column = columns[h];
						// Fill missing columns with null values to support partial data insertion
						const value = rows[j][column.name] ?? null;
						insertArray[h] = normalizeValue(value, column.type, dbType);
					}
					completeRows[j - start] = insertArray;
				}

				const query = em
					.createQueryBuilder()
					.insert()
					.into(table, columnNames)
					.values(completeRows);
				await query.execute();
				insertedRows += completeRows.length;
			}
			return { success: true, insertedRows } as const;
		});
	}

	async insertRows<T extends DataTableInsertRowsReturnType>(
		dataStoreId: string,
		rows: DataStoreRows,
		columns: DataTableColumn[],
		returnType: T,
		trx?: EntityManager,
	): Promise<DataTableInsertRowsResult<T>>;
	async insertRows<T extends DataTableInsertRowsReturnType>(
		dataStoreId: string,
		rows: DataStoreRows,
		columns: DataTableColumn[],
		returnType: T,
		trx?: EntityManager,
	): Promise<DataTableInsertRowsResult> {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const inserted: Array<Pick<DataStoreRowReturn, 'id'>> = [];
			const dbType = this.dataSource.options.type;
			const useReturning = dbType === 'postgres' || dbType === 'mariadb';

			const table = toTableName(dataStoreId);
			const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
			const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
				this.dataSource.driver.escape(x),
			);
			const selectColumns = [...escapedSystemColumns, ...escapedColumns];

			if (returnType === 'count') {
				return await this.insertRowsBulk(table, rows, columns, em);
			}

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

				const query = em.createQueryBuilder().insert().into(table).values(completeRow);

				if (useReturning) {
					query.returning(returnType === 'all' ? selectColumns.join(',') : 'id');
				}

				const result = await query.execute();

				if (useReturning) {
					const returned =
						returnType === 'all'
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

				if (returnType === 'id') {
					inserted.push(...ids.map((id) => ({ id })));
					continue;
				}

				const insertedRows = await this.getManyByIds(dataStoreId, ids, columns, em);

				inserted.push(...insertedRows);
			}

			return inserted;
		});
	}

	async updateRow<T extends boolean | undefined>(
		dataStoreId: string,
		data: Record<string, DataStoreColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		returnData?: T,
		trx?: EntityManager,
	): Promise<T extends true ? DataStoreRowReturn[] : true>;
	async updateRow(
		dataStoreId: string,
		data: Record<string, DataStoreColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		returnData: boolean = false,
		trx?: EntityManager,
	) {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const dbType = this.dataSource.options.type;
			const useReturning = dbType === 'postgres';

			const table = toTableName(dataStoreId);
			const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
			const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
				this.dataSource.driver.escape(x),
			);
			const selectColumns = [...escapedSystemColumns, ...escapedColumns];
			const setData = { ...data };

			for (const column of columns) {
				if (column.name in setData) {
					setData[column.name] = normalizeValue(setData[column.name], column.type, dbType);
				}
			}

			let affectedRows: Array<Pick<DataStoreRowReturn, 'id'>> = [];
			if (!useReturning && returnData) {
				// Only Postgres supports RETURNING statement on updates (with our typeorm),
				// on other engines we must query the list of updates rows later by ID
				const selectQuery = em.createQueryBuilder().select('id').from(table, 'dataTable');
				this.applyFilters(selectQuery, filter, 'dataTable', columns);
				affectedRows = await selectQuery.getRawMany<{ id: number }>();
			}

			setData.updatedAt = normalizeValue(new Date(), 'date', dbType);

			const query = em.createQueryBuilder().update(table);
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
			return await this.getManyByIds(dataStoreId, ids, columns, em);
		});
	}

	/**
	 * Deletes rows from the data table.
	 * Note: `dryRun` overrides `returnData` and always returns the affected rows without deleting them.
	 *
	 * @param dataTableId - The ID of the data table.
	 * @param columns - The columns of the data table.
	 * @param filter - The filter to select rows for deletion.
	 * @param returnData - Whether to return the deleted rows.
	 * @param dryRun - If true, simulates deletion and returns affected rows without deleting.
	 */
	async deleteRows(
		dataTableId: string,
		columns: DataTableColumn[],
		filter: DataTableFilter | undefined,
		returnData: boolean = false,
		dryRun: boolean = false,
		trx?: EntityManager,
	) {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const dbType = this.dataSource.options.type;
			const useReturning = !dryRun && dbType === 'postgres';
			const shouldReturnData = returnData || dryRun;
			const table = toTableName(dataTableId);

			if (!shouldReturnData) {
				// Just delete and return true
				const query = em.createQueryBuilder().delete().from(table, 'dataTable');
				if (filter) {
					this.applyFilters(query, filter, undefined, columns);
				}
				await query.execute();

				return true;
			}

			let affectedRows: DataStoreRowReturn[] = [];

			if (!useReturning) {
				const selectQuery = em.createQueryBuilder().select('*').from(table, 'dataTable');

				if (filter) {
					this.applyFilters(selectQuery, filter, 'dataTable', columns);
				}

				const rawRows = await selectQuery.getRawMany<DataStoreRowReturn>();
				affectedRows = normalizeRows(rawRows, columns);
			}

			// Skip deletion for dry run
			if (dryRun) {
				return affectedRows;
			}

			const deleteQuery = em.createQueryBuilder().delete().from(table, 'dataTable');

			if (useReturning) {
				const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
				const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
					this.dataSource.driver.escape(x),
				);
				const selectColumns = [...escapedSystemColumns, ...escapedColumns];
				deleteQuery.returning(selectColumns.join(','));
			}

			if (filter) {
				this.applyFilters(deleteQuery, filter, undefined, columns);
			}

			const result = await deleteQuery.execute();

			if (useReturning) {
				affectedRows = normalizeRows(extractReturningData(result.raw), columns);
			}

			return affectedRows;
		});
	}

	async createTableWithColumns(
		dataStoreId: string,
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			if (!em.queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			const dslColumns = [new DslColumn('id').int.autoGenerate2.primary, ...toDslColumns(columns)];
			const createTable = new CreateTable(toTableName(dataStoreId), '', em.queryRunner).withColumns(
				...dslColumns,
			).withTimestamps;

			await createTable.execute(em.queryRunner);
		});
	}

	async dropTable(dataStoreId: string, trx?: EntityManager) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			if (!em.queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}
			await em.queryRunner.dropTable(toTableName(dataStoreId), true);
		});
	}

	async addColumn(
		dataStoreId: string,
		column: DataTableColumn,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			await em.query(addColumnQuery(toTableName(dataStoreId), column, dbType));
		});
	}

	async dropColumnFromTable(
		dataStoreId: string,
		columnName: string,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			await em.query(deleteColumnQuery(toTableName(dataStoreId), columnName, dbType));
		});
	}

	async getManyAndCount(
		dataStoreId: string,
		dto: ListDataStoreContentQueryDto,
		columns?: DataTableColumn[],
		trx?: EntityManager,
	) {
		return await withTransaction(
			this.dataSource.manager,
			trx,
			async (em) => {
				const [countQuery, query] = this.getManyQuery(dataStoreId, dto, em, columns);
				const data: DataStoreRowsReturn = await query.select('*').getRawMany();
				const countResult = await countQuery.select('COUNT(*) as count').getRawOne<{
					count: number | string | null;
				}>();
				const count =
					typeof countResult?.count === 'number'
						? countResult.count
						: Number(countResult?.count) || 0;
				return { count: count ?? -1, data };
			},
			false,
		);
	}

	async getManyByIds(
		dataStoreId: string,
		ids: number[],
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		return await withTransaction(
			this.dataSource.manager,
			trx,
			async (em) => {
				const table = toTableName(dataStoreId);
				const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
				const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
					this.dataSource.driver.escape(x),
				);
				const selectColumns = [...escapedSystemColumns, ...escapedColumns];

				if (ids.length === 0) {
					return [];
				}

				const rows = await em
					.createQueryBuilder()
					.select(selectColumns)
					.from(table, 'dataTable')
					.where({ id: In(ids) })
					.getRawMany<DataStoreRowReturn>();

				return normalizeRows(rows, columns);
			},
			false,
		);
	}

	private getManyQuery(
		dataStoreId: string,
		dto: ListDataStoreContentQueryDto,
		em: EntityManager,
		columns?: DataTableColumn[],
	): [QueryBuilder, QueryBuilder] {
		const query = em.createQueryBuilder();

		const tableReference = 'dataTable';
		query.from(toTableName(dataStoreId), tableReference);
		if (dto.filter) {
			this.applyFilters(query, dto.filter, tableReference, columns);
		}
		const countQuery = query.clone().select('COUNT(*)');
		this.applySorting(query, dto);
		this.applyPagination(query, dto);

		return [countQuery, query];
	}

	private applyFilters<T extends ObjectLiteral>(
		query: SelectQueryBuilder<T> | UpdateQueryBuilder<T> | DeleteQueryBuilder<T>,
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

		if (conditionsAndParams.length === 1) {
			// Always use AND for a single filter
			const [condition, params] = conditionsAndParams[0];
			query.andWhere(condition, params);
		} else {
			for (const [condition, params] of conditionsAndParams) {
				if (filterType === 'or') {
					query.orWhere(condition, params);
				} else {
					query.andWhere(condition, params);
				}
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
		query.skip(dto.skip ?? 0);
		if (dto.take) query.take(dto.take);
	}
}
