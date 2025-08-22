import type {
	ListDataStoreContentQueryDto,
	ListDataStoreContentFilter,
	UpsertDataStoreRowsDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { CreateTable, DslColumn } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, DataSourceOptions, QueryRunner, SelectQueryBuilder } from '@n8n/typeorm';
import { DataStoreColumnJsType, DataStoreRows } from 'n8n-workflow';

import { DataStoreColumn } from './data-store-column.entity';
import { DataStoreUserTableName } from './data-store.types';
import {
	addColumnQuery,
	buildColumnTypeMap,
	deleteColumnQuery,
	extractInsertedIds,
	getPlaceholder,
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

	async insertRows(dataStoreId: string, rows: DataStoreRows, columns: DataStoreColumn[]) {
		const insertedIds: number[] = [];

		// We insert one by one as the default behavior of returning the last inserted ID
		// is consistent, whereas getting all inserted IDs when inserting multiple values is
		// surprisingly awkward without Entities, e.g. `RETURNING id` explicitly does not aggregate
		// and the `identifiers` array output of `execute()` is empty
		for (const row of rows) {
			const dbType = this.dataSource.options.type;

			for (const column of columns) {
				row[column.name] = normalizeValue(row[column.name], column.type, dbType);
			}

			const query = this.dataSource
				.createQueryBuilder()
				.insert()
				.into(
					this.toTableName(dataStoreId),
					columns.map((c) => c.name),
				)
				.values(row);

			if (dbType === 'postgres' || dbType === 'mariadb') {
				query.returning('id');
			}

			const result = await query.execute();

			insertedIds.push(...extractInsertedIds(result.raw, dbType));
		}

		return insertedIds;
	}

	// TypeORM cannot infer the columns for a dynamic table name, so we use a raw query
	async upsertRows(dataStoreId: string, dto: UpsertDataStoreRowsDto, columns: DataStoreColumn[]) {
		const { rows, matchFields } = dto;

		const { rowsToInsert, rowsToUpdate } = await this.fetchAndSplitRowsByExistence(
			dataStoreId,
			matchFields,
			rows,
		);

		if (rowsToInsert.length > 0) {
			await this.insertRows(dataStoreId, rowsToInsert, columns);
		}

		if (rowsToUpdate.length > 0) {
			for (const row of rowsToUpdate) {
				const updateKeys = Object.keys(row).filter((key) => !matchFields.includes(key));
				if (updateKeys.length === 0) {
					return true;
				}

				const setData = Object.fromEntries(updateKeys.map((key) => [key, row[key]]));
				const whereData = Object.fromEntries(matchFields.map((key) => [key, row[key]]));

				await this.updateRow(dataStoreId, setData, whereData, columns);
			}
		}

		return true;
	}

	async updateRow(
		dataStoreId: string,
		setData: Record<string, DataStoreColumnJsType | null>,
		whereData: Record<string, DataStoreColumnJsType | null>,
		columns: DataStoreColumn[],
	) {
		const dbType = this.dataSource.options.type;
		const columnTypeMap = buildColumnTypeMap(columns);

		const queryBuilder = this.dataSource.createQueryBuilder().update(this.toTableName(dataStoreId));

		const setValues: Record<string, DataStoreColumnJsType | null> = {};
		for (const [key, value] of Object.entries(setData)) {
			setValues[key] = normalizeValue(value, columnTypeMap[key], dbType);
		}

		queryBuilder.set(setValues);

		const normalizedWhereData: Record<string, DataStoreColumnJsType | null> = {};
		for (const [field, value] of Object.entries(whereData)) {
			normalizedWhereData[field] = normalizeValue(value, columnTypeMap[field], dbType);
		}
		queryBuilder.where(normalizedWhereData);

		await queryBuilder.execute();
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
		const createTable = new CreateTable(this.toTableName(dataStoreId), '', queryRunner);
		createTable.withColumns.apply(createTable, dslColumns);

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
		const dbType = this.dataSource.options.type;
		const whereClauses: string[] = [];
		const params: unknown[] = [];

		for (const row of rows) {
			const clause = matchFields
				.map((field) => {
					params.push(row[field]);
					return `${quoteIdentifier(field, dbType)} = ${getPlaceholder(params.length, dbType)}`;
				})
				.join(' AND ');
			whereClauses.push(`(${clause})`);
		}

		const quotedFields = matchFields.map((field) => quoteIdentifier(field, dbType)).join(', ');
		const quotedTableName = quoteIdentifier(this.toTableName(dataStoreId), dbType);

		const query = `
        SELECT ${quotedFields}
        FROM ${quotedTableName}
        WHERE ${whereClauses.join(' OR ')}
    `;
		const existing: Array<Record<string, unknown>> = await this.dataSource.query(query, params);

		return splitRowsByExistence(existing, matchFields, rows);
	}
}
