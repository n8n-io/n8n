import { DataTableFilter, ListDataTableContentQueryDto } from '@n8n/api-types';
import { withTransaction } from '@n8n/db';
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
	DataTableColumnJsType,
	DataTableRows,
	DataTableRowReturn,
	UnexpectedError,
	DataTableRowsReturn,
	DATA_TABLE_SYSTEM_COLUMNS,
	DataTableInsertRowsReturnType,
	DataTableInsertRowsResult,
	DataTableRowReturnWithState,
	DataTableRawRowReturn,
} from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableUserTableName } from './data-table.types';
import {
	escapeLikeSpecials,
	extractInsertedIds,
	extractReturningData,
	normalizeRows,
	normalizeValueForDatabase,
	quoteIdentifier,
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

	// For filters, we let TypeORM handle date conversion through parameterized queries.
	const value = filter.value;

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
export class DataTableRowsRepository {
	constructor(private dataSource: DataSource) {}

	async insertRowsBulk(
		table: DataTableUserTableName,
		rows: DataTableRows,
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

				const completeRows = new Array<DataTableColumnJsType[]>(endExclusive - start);
				for (let j = start; j < endExclusive; ++j) {
					const insertArray: DataTableColumnJsType[] = [];

					for (let h = 0; h < columnNames.length; ++h) {
						const column = columns[h];
						// Fill missing columns with null values to support partial data insertion
						const value = rows[j][column.name] ?? null;
						insertArray[h] = normalizeValueForDatabase(value, column.type, dbType);
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
		dataTableId: string,
		rows: DataTableRows,
		columns: DataTableColumn[],
		returnType: T,
		trx?: EntityManager,
	): Promise<DataTableInsertRowsResult<T>>;
	async insertRows<T extends DataTableInsertRowsReturnType>(
		dataTableId: string,
		rows: DataTableRows,
		columns: DataTableColumn[],
		returnType: T,
		trx?: EntityManager,
	): Promise<DataTableInsertRowsResult> {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const inserted: Array<Pick<DataTableRowReturn, 'id'>> = [];
			const dbType = this.dataSource.options.type;
			const useReturning = dbType === 'postgres' || dbType === 'mariadb';

			const table = toTableName(dataTableId);
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
					completeRow[column.name] = normalizeValueForDatabase(
						completeRow[column.name],
						column.type,
						dbType,
					);
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

				const insertedRows = await this.getManyByIds(dataTableId, ids, columns, em);

				inserted.push(...insertedRows);
			}

			return inserted;
		});
	}

	async updateRows<T extends boolean | undefined>(
		dataTableId: string,
		data: Record<string, DataTableColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		returnData?: T,
		trx?: EntityManager,
	): Promise<T extends true ? DataTableRowReturn[] : true>;
	async updateRows(
		dataTableId: string,
		data: Record<string, DataTableColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		returnData: boolean = false,
		trx?: EntityManager,
	) {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const dbType = this.dataSource.options.type;
			const useReturning = dbType === 'postgres';

			const table = toTableName(dataTableId);
			const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
			const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
				this.dataSource.driver.escape(x),
			);
			const selectColumns = [...escapedSystemColumns, ...escapedColumns];
			const setData = this.prepareUpdateData(data, columns, dbType);

			let affectedRows: Array<Pick<DataTableRowReturn, 'id'>> = [];
			if (!useReturning && returnData) {
				// Only Postgres supports RETURNING statement on updates (with our typeorm),
				// on other engines we must query the list of updates rows later by ID
				affectedRows = await this.getAffectedRowsForUpdate(dataTableId, filter, columns, true, trx);
			}

			setData.updatedAt = normalizeValueForDatabase(new Date(), 'date', dbType);

			const query = em.createQueryBuilder().update(table);
			// Some DBs (like SQLite) don't allow using table aliases as column prefixes in UPDATE statements
			this.applyFilters(query, filter, undefined);
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
			return await this.getManyByIds(dataTableId, ids, columns, em);
		});
	}

	async dryRunUpdateRows(
		dataTableId: string,
		data: Record<string, DataTableColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		trx?: EntityManager,
	): Promise<DataTableRowReturnWithState[]> {
		const dbType = this.dataSource.options.type;

		const beforeRows = await this.getAffectedRowsForUpdate(
			dataTableId,
			filter,
			columns,
			false,
			trx,
		);

		const columnUpdates = this.prepareUpdateData(data, columns, dbType);

		return beforeRows.flatMap((original) => {
			const updated = { ...original, ...columnUpdates, updatedAt: new Date() };
			return this.toDryRunRows(original, updated);
		});
	}

	async dryRunUpsertRow(
		dataTableId: string,
		data: Record<string, DataTableColumnJsType | null>,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		trx?: EntityManager,
	): Promise<DataTableRowReturnWithState[]> {
		const updateResult = await this.dryRunUpdateRows(dataTableId, data, filter, columns, trx);

		if (updateResult.length > 0) {
			return updateResult;
		}

		// No rows were updated, simulate insert
		const dbType = this.dataSource.options.type;
		const now = new Date();
		const preparedData = this.prepareUpdateData(data, columns, dbType);
		const insertedRow: DataTableRowReturn = {
			id: 0, // Placeholder ID for dry run
			createdAt: now,
			updatedAt: now,
			...preparedData,
		};

		return this.toDryRunRows(null, insertedRow);
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
					this.applyFilters(query, filter, undefined);
				}
				await query.execute();

				return true;
			}

			let affectedRows: DataTableRowReturn[] = [];

			if (!useReturning) {
				const selectQuery = em.createQueryBuilder().select('*').from(table, 'dataTable');

				if (filter) {
					this.applyFilters(selectQuery, filter, 'dataTable');
				}

				const rawRows = await selectQuery.getRawMany<DataTableRawRowReturn>();
				affectedRows = normalizeRows(rawRows, columns);
			}

			// Skip deletion for dry run
			if (dryRun) {
				return affectedRows.flatMap((row) => this.toDryRunRows(row, null));
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
				this.applyFilters(deleteQuery, filter, undefined);
			}

			const result = await deleteQuery.execute();

			if (useReturning) {
				affectedRows = normalizeRows(extractReturningData(result.raw), columns);
			}

			return affectedRows;
		});
	}

	private async getAffectedRowsForUpdate<T extends boolean>(
		dataTableId: string,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		idsOnly: T,
		trx?: EntityManager,
	): Promise<T extends true ? Array<Pick<DataTableRowReturn, 'id'>> : DataTableRowReturn[]> {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const table = toTableName(dataTableId);
			const selectColumns = idsOnly ? 'id' : '*';
			const selectQuery = em.createQueryBuilder().select(selectColumns).from(table, 'dataTable');
			this.applyFilters(selectQuery, filter, 'dataTable');
			const rawRows: DataTableRowsReturn = await selectQuery.getRawMany();

			if (idsOnly) {
				return rawRows;
			}

			return normalizeRows(rawRows, columns);
		});
	}

	private prepareUpdateData(
		data: Record<string, DataTableColumnJsType | null>,
		columns: DataTableColumn[],
		dbType: DataSourceOptions['type'],
	): Record<string, DataTableColumnJsType | null> {
		const setData = { ...data };
		for (const column of columns) {
			if (column.name in setData) {
				setData[column.name] = normalizeValueForDatabase(setData[column.name], column.type, dbType);
			}
		}
		return setData;
	}

	private toDryRunRows(
		beforeState: DataTableRowReturn | null,
		afterState: DataTableRowReturn | null,
	): DataTableRowReturnWithState[] {
		if (beforeState === null && afterState === null) {
			throw new Error('Both before and after rows cannot be null');
		}

		if (beforeState && afterState) {
			return [
				{ ...beforeState, dryRunState: 'before' },
				{ ...afterState, dryRunState: 'after' },
			];
		}

		// If one of the states is null, create a template row with nulls for missing values
		const template = (beforeState ?? afterState)!;
		const nullRow = {
			id: null,
			createdAt: null,
			updatedAt: null,
			...Object.fromEntries(Object.keys(template).map((key) => [key, null])),
		};

		const before = beforeState ?? nullRow;
		const after = afterState ?? nullRow;

		return [
			{ ...before, dryRunState: 'before' },
			{ ...after, dryRunState: 'after' },
		];
	}

	async getManyAndCount(
		dataTableId: string,
		dto: ListDataTableContentQueryDto,
		trx?: EntityManager,
	) {
		return await withTransaction(
			this.dataSource.manager,
			trx,
			async (em) => {
				const [countQuery, query] = this.getManyQuery(dataTableId, dto, em);
				const data: DataTableRowsReturn = await query.select('*').getRawMany();
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
		dataTableId: string,
		ids: number[],
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		return await withTransaction(
			this.dataSource.manager,
			trx,
			async (em) => {
				const table = toTableName(dataTableId);
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
					.getRawMany<DataTableRawRowReturn>();

				return normalizeRows(rows, columns);
			},
			false,
		);
	}

	private getManyQuery(
		dataTableId: string,
		dto: ListDataTableContentQueryDto,
		em: EntityManager,
	): [QueryBuilder, QueryBuilder] {
		const query = em.createQueryBuilder();

		const tableReference = 'dataTable';
		query.from(toTableName(dataTableId), tableReference);
		if (dto.filter) {
			this.applyFilters(query, dto.filter, tableReference);
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
	): void {
		const filters = filter.filters ?? [];
		const filterType = filter.type ?? 'and';

		const dbType = this.dataSource.options.type;
		const conditionsAndParams = filters.map((filter, i) =>
			getConditionAndParams(filter, i, dbType, tableReference),
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

	private applySorting(query: QueryBuilder, dto: ListDataTableContentQueryDto): void {
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

	private applyPagination(query: QueryBuilder, dto: ListDataTableContentQueryDto): void {
		query.skip(dto.skip ?? 0);
		if (dto.take) query.take(dto.take);
	}
}
