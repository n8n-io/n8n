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
	DATA_TABLE_AUTOMATION_STATUS_COLUMN,
	DATA_TABLE_SYSTEM_COLUMNS,
	DataTableInsertRowsReturnType,
	DataTableInsertRowsResult,
	DataTableRowReturnWithState,
	DataTableRawRowReturn,
	UserError,
} from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import {
	allocateKanbanOrders,
	decodeKanbanCursor,
	encodeKanbanCursor,
} from './data-table-kanban.utils';
import { DATA_TABLE_KANBAN_ORDER_COLUMN, type DataTableUserTableName } from './data-table.types';
import { DataTableKanbanConflictError } from './errors/data-table-kanban-conflict.error';
import {
	escapeLikeSpecials,
	extractInsertedIds,
	extractReturningData,
	isValidColumnName,
	normalizeRows,
	normalizeValueForDatabase,
	quoteIdentifier,
	toSqliteGlobFromPercent,
	toTableName,
} from './utils/sql-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = SelectQueryBuilder<any>;

export type DataTableKanbanLane = {
	value: string | null;
	count: number;
	rows: DataTableRowReturn[];
	nextCursor: string | null;
	hasMore: boolean;
};

export type DataTableKanbanPage = {
	rows: DataTableRowReturn[];
	nextCursor: string | null;
	hasMore: boolean;
};

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
 */
function getConditionAndParams(
	filter: DataTableFilter['filters'][number],
	index: number,
	dbType: DataSourceOptions['type'],
	tableReference?: string,
	columnRefOverride?: string,
): [string, Record<string, unknown>] {
	const paramName = `filter_${index}`;
	const columnRef =
		columnRefOverride ??
		(tableReference
			? `${quoteIdentifier(tableReference, dbType)}.${quoteIdentifier(filter.columnName, dbType)}`
			: quoteIdentifier(filter.columnName, dbType));

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
		kanbanOrders: string[],
		trx?: EntityManager,
	) {
		const columnNames = columns.map((column) => column.name);
		columnNames.push(DATA_TABLE_KANBAN_ORDER_COLUMN);

		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			let insertedRows = 0;

			// Special case: no columns, insert each row individually
			if (columns.length === 0) {
				for (const [index, row] of rows.entries()) {
					const query = em
						.createQueryBuilder()
						.insert()
						.into(table)
						.values({ ...row, [DATA_TABLE_KANBAN_ORDER_COLUMN]: kanbanOrders[index] });
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
			const batches = Math.max(1, Math.ceil((columnNames.length * rows.length) / batchSize));
			const rowsPerBatch = Math.ceil(rows.length / batches);

			const dbType = this.dataSource.options.type;

			for (let i = 0; i < batches; ++i) {
				const start = i * rowsPerBatch;
				const endExclusive = Math.min(rows.length, (i + 1) * rowsPerBatch);

				if (endExclusive <= start) break;

				const completeRows = new Array<DataTableColumnJsType[]>(endExclusive - start);
				for (let j = start; j < endExclusive; ++j) {
					const insertArray: DataTableColumnJsType[] = [];

					for (let h = 0; h < columns.length; ++h) {
						const column = columns[h];
						// Fill missing columns with null values to support partial data insertion
						const value = rows[j][column.name] ?? null;
						insertArray[h] = normalizeValueForDatabase(value, column.type, dbType);
					}
					// Update last column which is the kanban order column
					insertArray[columns.length] = kanbanOrders[j];
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
			const useReturning = dbType === 'postgres';

			const table = toTableName(dataTableId);
			const kanbanOrders = await this.allocateTopKanbanOrders(dataTableId, rows.length, em);
			const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
			const escapedSystemColumns = DATA_TABLE_SYSTEM_COLUMNS.map((x) =>
				this.dataSource.driver.escape(x),
			);
			const selectColumns = [...escapedSystemColumns, ...escapedColumns];

			if (returnType === 'count') {
				return await this.insertRowsBulk(table, rows, columns, kanbanOrders, em);
			}

			// We insert one by one as the default behavior of returning the last inserted ID
			// is consistent, whereas getting all inserted IDs when inserting multiple values is
			// surprisingly awkward without Entities, e.g. `RETURNING id` explicitly does not aggregate
			// and the `identifiers` array output of `execute()` is empty
			for (const [rowIndex, row] of rows.entries()) {
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
				completeRow[DATA_TABLE_KANBAN_ORDER_COLUMN] = kanbanOrders[rowIndex];

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
				affectedRows = await this.getAffectedRowsForUpdate(dataTableId, filter, columns, true, em);
			}

			setData.updatedAt = normalizeValueForDatabase(new Date(), 'date', dbType);

			const query = em.createQueryBuilder().update(table);
			// Some DBs (like SQLite) don't allow using table aliases as column prefixes in UPDATE statements
			this.applyFilters(query, filter, undefined, dataTableId);
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
					this.applyFilters(query, filter, undefined, dataTableId);
				}
				await query.execute();

				return true;
			}

			let affectedRows: DataTableRowReturn[] = [];

			if (!useReturning) {
				const selectQuery = em.createQueryBuilder().select('*').from(table, 'dataTable');

				if (filter) {
					this.applyFilters(selectQuery, filter, 'dataTable', dataTableId);
				}

				selectQuery.select(this.publicSelectColumns('dataTable', columns));
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
				this.applyFilters(deleteQuery, filter, undefined, dataTableId);
			}

			const result = await deleteQuery.execute();

			if (useReturning) {
				affectedRows = normalizeRows(extractReturningData(result.raw), columns);
			}

			return affectedRows;
		});
	}

	async clearRows(dataTableId: string, trx?: EntityManager): Promise<{ deletedCount: number }> {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const table = toTableName(dataTableId);
			const result = await em.createQueryBuilder().delete().from(table).execute();
			return { deletedCount: result.affected ?? 0 };
		});
	}

	async getAffectedRowsForUpdate<T extends boolean>(
		dataTableId: string,
		filter: DataTableFilter,
		columns: DataTableColumn[],
		idsOnly: T,
		trx?: EntityManager,
	): Promise<T extends true ? Array<Pick<DataTableRowReturn, 'id'>> : DataTableRowReturn[]> {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			const table = toTableName(dataTableId);
			const selectQuery = em.createQueryBuilder().from(table, 'dataTable');
			if (idsOnly) {
				selectQuery.select('id');
			} else {
				selectQuery.select(this.publicSelectColumns('dataTable', columns));
			}
			this.applyFilters(selectQuery, filter, 'dataTable', dataTableId);
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

	async getKanbanBoard(
		dataTableId: string,
		groupColumnName: string,
		laneValues: Array<string | null>,
		rowsPerLane: number,
		search: string | undefined,
		generation: string,
		columns: DataTableColumn[],
		trx?: EntityManager,
	): Promise<DataTableKanbanLane[]> {
		const em = trx ?? this.dataSource.manager;
		const dbType = this.dataSource.options.type;
		const tableReference = 'dataTable';
		const tableRef = quoteIdentifier(tableReference, dbType);
		const groupColumn = `${tableRef}.${quoteIdentifier(groupColumnName, dbType)}`;
		const orderColumn = `${tableRef}.${quoteIdentifier(DATA_TABLE_KANBAN_ORDER_COLUMN, dbType)}`;
		const idColumn = `${tableRef}.${quoteIdentifier('id', dbType)}`;
		const baseQuery = em
			.createQueryBuilder()
			.select('*')
			.addSelect(groupColumn, '__laneValue')
			.addSelect(orderColumn, '__kanbanOrder')
			.addSelect(
				`ROW_NUMBER() OVER (PARTITION BY ${groupColumn} ORDER BY ${orderColumn} DESC, ${idColumn} DESC)`,
				'__laneRowNumber',
			)
			.addSelect(`COUNT(*) OVER (PARTITION BY ${groupColumn})`, '__laneCount')
			.from(toTableName(dataTableId), tableReference)
			.andWhere(`${orderColumn} IS NOT NULL`);
		if (search?.trim()) this.applySearch(baseQuery, search, tableReference, columns);

		const laneRowNumber = quoteIdentifier('__laneRowNumber', dbType);
		const laneValue = quoteIdentifier('__laneValue', dbType);
		const rankedQuery = em
			.createQueryBuilder()
			.select('*')
			.from(`(${baseQuery.getQuery()})`, 'ranked')
			.where(`${laneRowNumber} <= :rowsPerLane`, { rowsPerLane })
			.setParameters(baseQuery.getParameters())
			.orderBy(laneValue, 'ASC')
			.addOrderBy(laneRowNumber, 'ASC');
		const rawRows = await rankedQuery.getRawMany<
			DataTableRawRowReturn & {
				__laneValue: string | null;
				__kanbanOrder: string;
				__laneRowNumber: number | string;
				__laneCount: number | string;
			}
		>();

		const grouped = new Map<string | null, typeof rawRows>();
		for (const rawRow of rawRows) {
			const group = grouped.get(rawRow.__laneValue) ?? [];
			group.push(rawRow);
			grouped.set(rawRow.__laneValue, group);
		}

		return laneValues.map((value) => {
			const laneRows = grouped.get(value) ?? [];
			const rows = laneRows.map((row) => this.normalizeKanbanRow(row, columns));
			const count = Number(laneRows[0]?.__laneCount ?? 0);
			const last = laneRows.at(-1);
			return {
				value,
				count,
				rows,
				hasMore: rows.length < count,
				nextCursor:
					rows.length < count && last
						? encodeKanbanCursor(last.__kanbanOrder, last.id, generation)
						: null,
			};
		});
	}

	async getKanbanLanePage(
		dataTableId: string,
		groupColumnName: string,
		laneValue: string | null,
		limit: number,
		cursor: string | undefined,
		search: string | undefined,
		generation: string,
		columns: DataTableColumn[],
		trx?: EntityManager,
	): Promise<DataTableKanbanPage> {
		const em = trx ?? this.dataSource.manager;
		const dbType = this.dataSource.options.type;
		const tableReference = 'dataTable';
		const tableRef = quoteIdentifier(tableReference, dbType);
		const orderColumn = `${tableRef}.${quoteIdentifier(DATA_TABLE_KANBAN_ORDER_COLUMN, dbType)}`;
		const idColumn = `${tableRef}.${quoteIdentifier('id', dbType)}`;
		const query = em
			.createQueryBuilder()
			.select('*')
			.from(toTableName(dataTableId), tableReference)
			.andWhere(`${orderColumn} IS NOT NULL`);
		this.applyKanbanLaneFilter(query, tableReference, groupColumnName, laneValue);
		if (search?.trim()) this.applySearch(query, search, tableReference, columns);
		if (cursor) {
			const decoded = decodeKanbanCursor(cursor, generation);
			query.andWhere(
				`(${orderColumn} < :cursorOrder OR (${orderColumn} = :cursorOrder AND ${idColumn} < :cursorId))`,
				{ cursorOrder: decoded.order, cursorId: decoded.id },
			);
		}
		query
			.orderBy(orderColumn, 'DESC')
			.addOrderBy(idColumn, 'DESC')
			.take(limit + 1);
		const rawRows = await query.getRawMany<DataTableRawRowReturn>();
		const hasMore = rawRows.length > limit;
		const pageRows = hasMore ? rawRows.slice(0, limit) : rawRows;
		const rows = pageRows.map((row) => this.normalizeKanbanRow(row, columns));
		const last = pageRows.at(-1);
		return {
			rows,
			hasMore,
			nextCursor:
				hasMore && last
					? encodeKanbanCursor(String(last[DATA_TABLE_KANBAN_ORDER_COLUMN]), last.id, generation)
					: null,
		};
	}

	async moveKanbanRow(
		dataTableId: string,
		rowId: number,
		groupColumnName: string,
		targetValue: string | null,
		afterRowId: number | null,
		columns: DataTableColumn[],
		trx: EntityManager,
	): Promise<{ before: DataTableRowReturn; after: DataTableRowReturn }> {
		const beforeRaw = await this.getKanbanRowRaw(dataTableId, rowId, trx);
		if (!beforeRaw) throw new DataTableKanbanConflictError();

		let upperOrder: string | null = null;
		if (afterRowId !== null) {
			if (afterRowId === rowId) throw new DataTableKanbanConflictError();
			const anchor = await this.getKanbanRowRaw(dataTableId, afterRowId, trx);
			if (!anchor || anchor[groupColumnName] !== targetValue) {
				throw new DataTableKanbanConflictError();
			}
			upperOrder = String(anchor[DATA_TABLE_KANBAN_ORDER_COLUMN]);
		}

		let lowerOrder = await this.findKanbanSuccessorOrder(
			dataTableId,
			rowId,
			groupColumnName,
			targetValue,
			upperOrder,
			afterRowId,
			trx,
		);
		let [newOrder] = allocateKanbanOrders(1, upperOrder, lowerOrder) ?? [];
		if (!newOrder) {
			await this.rebalanceKanbanLane(dataTableId, groupColumnName, targetValue, trx);
			if (afterRowId !== null) {
				const anchor = await this.getKanbanRowRaw(dataTableId, afterRowId, trx);
				upperOrder = anchor ? String(anchor[DATA_TABLE_KANBAN_ORDER_COLUMN]) : null;
			}
			lowerOrder = await this.findKanbanSuccessorOrder(
				dataTableId,
				rowId,
				groupColumnName,
				targetValue,
				upperOrder,
				afterRowId,
				trx,
			);
			[newOrder] = allocateKanbanOrders(1, upperOrder, lowerOrder) ?? [];
		}
		if (!newOrder) throw new UnexpectedError('Could not allocate a Kanban position');

		const dbType = this.dataSource.options.type;
		await trx
			.createQueryBuilder()
			.update(toTableName(dataTableId))
			.set({
				[groupColumnName]: targetValue,
				[DATA_TABLE_KANBAN_ORDER_COLUMN]: newOrder,
				updatedAt: normalizeValueForDatabase(new Date(), 'date', dbType),
			})
			.where({ id: rowId })
			.execute();
		const afterRaw = await this.getKanbanRowRaw(dataTableId, rowId, trx);
		if (!afterRaw) throw new UnexpectedError('Could not read the moved Kanban row');
		return {
			before: this.normalizeKanbanRow(beforeRaw, columns),
			after: this.normalizeKanbanRow(afterRaw, columns),
		};
	}

	async moveRowsToKanbanTop(
		dataTableId: string,
		rowIds: number[],
		trx: EntityManager,
	): Promise<void> {
		const sortedIds = [...new Set(rowIds)].sort((left, right) => left - right);
		const orders = await this.allocateTopKanbanOrders(dataTableId, sortedIds.length, trx);
		for (const [index, rowId] of sortedIds.entries()) {
			await trx
				.createQueryBuilder()
				.update(toTableName(dataTableId))
				.set({ [DATA_TABLE_KANBAN_ORDER_COLUMN]: orders[index] })
				.where({ id: rowId })
				.execute();
		}
	}

	async getManyAndCount(
		dataTableId: string,
		dto: ListDataTableContentQueryDto,
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		const em = trx ?? this.dataSource.manager;

		const [countQuery, query] = this.getManyQuery(dataTableId, dto, columns, em);
		const data: DataTableRowsReturn = await query
			.select(this.publicSelectColumns('dataTable', columns))
			.getRawMany();
		const countResult = await countQuery.select('COUNT(*) as count').getRawOne<{
			count: number | string | null;
		}>();
		const count =
			typeof countResult?.count === 'number' ? countResult.count : Number(countResult?.count) || 0;
		return { count: count ?? -1, data };
	}

	async getManyByIds(
		dataTableId: string,
		ids: number[],
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		const em = trx ?? this.dataSource.manager;

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
	}

	private getManyQuery(
		dataTableId: string,
		dto: ListDataTableContentQueryDto,
		columns: DataTableColumn[],
		em: EntityManager,
	): [QueryBuilder, QueryBuilder] {
		const query = em.createQueryBuilder();

		const tableReference = 'dataTable';
		query.from(toTableName(dataTableId), tableReference);
		if (dto.filter) {
			this.applyFilters(query, dto.filter, tableReference, dataTableId);
		}

		if (dto.search && dto.search.trim().length > 0) {
			this.applySearch(query, dto.search, tableReference, columns);
		}

		const countQuery = query.clone().select('COUNT(*)');
		this.applySorting(query, dto, dataTableId);
		this.applyPagination(query, dto);

		return [countQuery, query];
	}

	private applySearch(
		query: QueryBuilder,
		rawSearch: string,
		tableReference: string,
		columns: DataTableColumn[],
	) {
		const dbType = this.dataSource.options.type;
		const searchTerm = rawSearch.includes('%') ? rawSearch : `%${rawSearch}%`;
		const isSqlite = ['sqlite', 'sqlite-pooled'].includes(dbType);
		const isPg = dbType === 'postgres';

		const allColumnNames: string[] = columns.map((c) => c.name);
		if (allColumnNames.length === 0) return;

		const tableRefQuoted = quoteIdentifier(tableReference, dbType);
		const conditions: string[] = [];

		for (const col of allColumnNames) {
			const colRef = `${tableRefQuoted}.${quoteIdentifier(col, dbType)}`;
			if (isSqlite) {
				conditions.push(`UPPER(CAST(${colRef} AS TEXT)) LIKE UPPER(:search) ESCAPE '\\'`);
				continue;
			}

			if (isPg) {
				conditions.push(`CAST(${colRef} AS TEXT) ILIKE :search ESCAPE '\\'`);
				continue;
			}

			conditions.push(`UPPER(CAST(${colRef} AS TEXT)) LIKE UPPER(:search)`);
		}

		if (conditions.length === 0) return;
		const whereClause = `(${conditions.join(' OR ')})`;
		query.andWhere(whereClause, { search: escapeLikeSpecials(searchTerm) });
	}

	private applyFilters<T extends ObjectLiteral>(
		query: SelectQueryBuilder<T> | UpdateQueryBuilder<T> | DeleteQueryBuilder<T>,
		filter: DataTableFilter,
		tableReference: string | undefined,
		dataTableId: string,
	): void {
		const filters = filter.filters ?? [];
		const filterType = filter.type ?? 'and';

		const dbType = this.dataSource.options.type;
		const conditionsAndParams = filters.map((filter, i): [string, Record<string, unknown>] => {
			if (filter.columnName !== DATA_TABLE_AUTOMATION_STATUS_COLUMN) {
				return getConditionAndParams(filter, i, dbType, tableReference);
			}
			const [sql, params] = this.automationStatusSql(dataTableId, tableReference);
			const [condition, filterParams] = getConditionAndParams(
				filter,
				i,
				dbType,
				tableReference,
				sql,
			);
			return [condition, { ...filterParams, ...params }];
		});

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

	private applySorting(
		query: QueryBuilder,
		dto: ListDataTableContentQueryDto,
		dataTableId: string,
	): void {
		if (dto.sortBy) {
			const [field, order] = dto.sortBy;
			this.applySortingByField(query, field, order, dataTableId);
		}

		// Always append the unique `id` as a final tiebreaker so skip/take pagination
		// returns a stable order across pages (avoids duplicate/missing rows).
		if (!dto.sortBy || dto.sortBy[0] !== 'id') {
			const dbType = this.dataSource.options.type;
			const quotedId = `${quoteIdentifier('dataTable', dbType)}.${quoteIdentifier('id', dbType)}`;
			query.addOrderBy(quotedId, 'ASC');
		}
	}

	private applySortingByField(
		query: QueryBuilder,
		field: string,
		direction: 'DESC' | 'ASC',
		dataTableId: string,
	): void {
		const dbType = this.dataSource.options.type;
		if (!isValidColumnName(field)) throw new UserError('Incorrect column format');

		if (field === DATA_TABLE_AUTOMATION_STATUS_COLUMN) {
			const [sql, params] = this.automationStatusSql(dataTableId, 'dataTable');
			query.orderBy(sql, direction).setParameters(params);
			return;
		}

		const quotedField = `${quoteIdentifier('dataTable', dbType)}.${quoteIdentifier(field, dbType)}`;
		query.orderBy(quotedField, direction);
	}

	/**
	 * The row's `automationStatus` as a scalar subquery: the worst status across its
	 * trigger nodes, so a row counts as failed while any trigger failed.
	 */
	private automationStatusSql(
		dataTableId: string,
		tableReference: string | undefined,
	): [string, Record<string, unknown>] {
		const dbType = this.dataSource.options.type;
		const q = (name: string) => quoteIdentifier(name, dbType);
		const rowIdRef = `${q(tableReference ?? toTableName(dataTableId))}.${q('id')}`;
		const rank = `CASE ${q('a')}.${q('status')} WHEN 'failed' THEN 0 WHEN 'running' THEN 1 WHEN 'waiting' THEN 2 ELSE 3 END`;
		const status = `CASE MIN(${rank}) WHEN 0 THEN 'failed' WHEN 1 THEN 'running' WHEN 2 THEN 'waiting' WHEN 3 THEN 'finished' END`;
		return [
			`(SELECT ${status} FROM ${q('data_table_row_automation')} ${q('a')} WHERE ${q('a')}.${q('dataTableId')} = :automationDataTableId AND ${q('a')}.${q('rowId')} = ${rowIdRef})`,
			{ automationDataTableId: dataTableId },
		];
	}

	private publicSelectColumns(tableReference: string, columns: DataTableColumn[]): string[] {
		const dbType = this.dataSource.options.type;
		const tableRef = quoteIdentifier(tableReference, dbType);
		return [...DATA_TABLE_SYSTEM_COLUMNS, ...columns.map((column) => column.name)].map(
			(column) => `${tableRef}.${quoteIdentifier(column, dbType)}`,
		);
	}

	private normalizeKanbanRow(
		rawRow: DataTableRawRowReturn,
		columns: DataTableColumn[],
	): DataTableRowReturn {
		const publicRow: DataTableRawRowReturn = {
			id: rawRow.id,
			createdAt: rawRow.createdAt,
			updatedAt: rawRow.updatedAt,
		};
		for (const column of columns) {
			publicRow[column.name] = rawRow[column.name] ?? null;
		}
		const [row] = normalizeRows([publicRow], columns);
		return row;
	}

	private applyKanbanLaneFilter(
		query: QueryBuilder,
		tableReference: string,
		groupColumnName: string,
		laneValue: string | null,
	): void {
		const dbType = this.dataSource.options.type;
		const column = `${quoteIdentifier(tableReference, dbType)}.${quoteIdentifier(groupColumnName, dbType)}`;
		if (laneValue === null) {
			query.andWhere(`${column} IS NULL`);
		} else {
			query.andWhere(`${column} = :laneValue`, { laneValue });
		}
	}

	private async allocateTopKanbanOrders(
		dataTableId: string,
		count: number,
		em: EntityManager,
	): Promise<string[]> {
		if (count === 0) return [];
		const dbType = this.dataSource.options.type;
		const tableReference = 'dataTable';
		const orderColumn = `${quoteIdentifier(tableReference, dbType)}.${quoteIdentifier(DATA_TABLE_KANBAN_ORDER_COLUMN, dbType)}`;
		const current = await em
			.createQueryBuilder()
			.select(orderColumn, 'order')
			.from(toTableName(dataTableId), tableReference)
			.where(`${orderColumn} IS NOT NULL`)
			.orderBy(orderColumn, 'DESC')
			.limit(1)
			.getRawOne<{ order: string }>();
		let orders = allocateKanbanOrders(count, null, current?.order ?? null);
		if (orders) return orders;

		await this.rebalanceKanbanTable(dataTableId, em);
		const rebalanced = await em
			.createQueryBuilder()
			.select(orderColumn, 'order')
			.from(toTableName(dataTableId), tableReference)
			.where(`${orderColumn} IS NOT NULL`)
			.orderBy(orderColumn, 'DESC')
			.limit(1)
			.getRawOne<{ order: string }>();
		orders = allocateKanbanOrders(count, null, rebalanced?.order ?? null);
		if (!orders) throw new UnexpectedError('Could not allocate Kanban positions');
		return orders;
	}

	private async getKanbanRowRaw(
		dataTableId: string,
		rowId: number,
		em: EntityManager,
	): Promise<DataTableRawRowReturn | null> {
		return (
			(await em
				.createQueryBuilder()
				.select('*')
				.from(toTableName(dataTableId), 'dataTable')
				.where({ id: rowId })
				.getRawOne<DataTableRawRowReturn>()) ?? null
		);
	}

	private async findKanbanSuccessorOrder(
		dataTableId: string,
		movingRowId: number,
		groupColumnName: string,
		targetValue: string | null,
		upperOrder: string | null,
		afterRowId: number | null,
		em: EntityManager,
	): Promise<string | null> {
		const dbType = this.dataSource.options.type;
		const tableReference = 'dataTable';
		const tableRef = quoteIdentifier(tableReference, dbType);
		const orderColumn = `${tableRef}.${quoteIdentifier(DATA_TABLE_KANBAN_ORDER_COLUMN, dbType)}`;
		const idColumn = `${tableRef}.${quoteIdentifier('id', dbType)}`;
		const query = em
			.createQueryBuilder()
			.select(orderColumn, 'order')
			.from(toTableName(dataTableId), tableReference)
			.where(`${idColumn} != :movingRowId`, { movingRowId })
			.andWhere(`${orderColumn} IS NOT NULL`);
		this.applyKanbanLaneFilter(query, tableReference, groupColumnName, targetValue);
		if (upperOrder !== null && afterRowId !== null) {
			query.andWhere(
				`(${orderColumn} < :upperOrder OR (${orderColumn} = :upperOrder AND ${idColumn} < :afterRowId))`,
				{ upperOrder, afterRowId },
			);
		}
		const successor = await query
			.orderBy(orderColumn, 'DESC')
			.addOrderBy(idColumn, 'DESC')
			.limit(1)
			.getRawOne<{ order: string }>();
		return successor?.order ?? null;
	}

	private async rebalanceKanbanLane(
		dataTableId: string,
		groupColumnName: string,
		laneValue: string | null,
		em: EntityManager,
	): Promise<void> {
		const query = this.kanbanOrderIdsQuery(dataTableId, em);
		this.applyKanbanLaneFilter(query, 'dataTable', groupColumnName, laneValue);
		const rows = await query.getRawMany<{ id: number }>();
		await this.writeRebalancedOrders(dataTableId, rows, em);
	}

	private async rebalanceKanbanTable(dataTableId: string, em: EntityManager): Promise<void> {
		const rows = await this.kanbanOrderIdsQuery(dataTableId, em).getRawMany<{ id: number }>();
		await this.writeRebalancedOrders(dataTableId, rows, em);
	}

	private kanbanOrderIdsQuery(dataTableId: string, em: EntityManager): QueryBuilder {
		const dbType = this.dataSource.options.type;
		const tableReference = 'dataTable';
		const tableRef = quoteIdentifier(tableReference, dbType);
		const orderColumn = `${tableRef}.${quoteIdentifier(DATA_TABLE_KANBAN_ORDER_COLUMN, dbType)}`;
		const idColumn = `${tableRef}.${quoteIdentifier('id', dbType)}`;
		return em
			.createQueryBuilder()
			.select(idColumn, 'id')
			.from(toTableName(dataTableId), tableReference)
			.orderBy(orderColumn, 'DESC')
			.addOrderBy(idColumn, 'DESC');
	}

	private async writeRebalancedOrders(
		dataTableId: string,
		rows: Array<{ id: number }>,
		em: EntityManager,
	): Promise<void> {
		const orders = allocateKanbanOrders(rows.length, null, null);
		if (!orders) throw new UnexpectedError('Could not rebalance Kanban positions');
		for (const [index, row] of rows.entries()) {
			await em
				.createQueryBuilder()
				.update(toTableName(dataTableId))
				.set({ [DATA_TABLE_KANBAN_ORDER_COLUMN]: orders[index] })
				.where({ id: row.id })
				.execute();
		}
	}

	private applyPagination(query: QueryBuilder, dto: ListDataTableContentQueryDto): void {
		query.skip(dto.skip ?? 0);
		if (dto.take) query.take(dto.take);
	}
}
