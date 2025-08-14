import type {
	ListDataStoreContentQueryDto,
	ListDataStoreContentFilter,
	DataStoreUserTableName,
	DataStoreRows,
	UpsertDataStoreRowsDto,
} from '@n8n/api-types';
import { CreateTable, DslColumn } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	DataSource,
	DataSourceOptions,
	EntityManager,
	QueryRunner,
	SelectQueryBuilder,
} from '@n8n/typeorm';

import { DataStoreColumn } from './data-store-column.entity';
import {
	addColumnQuery,
	buildInsertQuery,
	buildUpdateQuery,
	deleteColumnQuery,
	getPlaceholder,
	quoteIdentifier,
	splitRowsByExistence,
	toDslColumns,
	toTableName,
} from './utils/sql-utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = SelectQueryBuilder<any>;

function getConditionAndParams(
	filter: ListDataStoreContentFilter['filters'][number],
	index: number,
	dbType: DataSourceOptions['type'],
): [string, Record<string, unknown>] {
	const paramName = `filter_${index}`;
	const column = `dataStore.${quoteIdentifier(filter.columnName, dbType)}`;

	switch (filter.condition) {
		case 'eq':
			return [`${column} = :${paramName}`, { [paramName]: filter.value }];
		case 'neq':
			return [`${column} != :${paramName}`, { [paramName]: filter.value }];
	}
}

@Service()
export class DataStoreRowsRepository {
	constructor(private dataSource: DataSource) {}

	// TypeORM cannot infer the columns for a dynamic table name, so we use a raw query
	async insertRows(
		tableName: DataStoreUserTableName,
		rows: DataStoreRows,
		columns: DataStoreColumn[],
	) {
		const dbType = this.dataSource.options.type;
		await this.dataSource.query.apply(
			this.dataSource,
			buildInsertQuery(tableName, rows, columns, dbType),
		);
		return true;
	}

	async upsertRows(
		tableName: DataStoreUserTableName,
		dto: UpsertDataStoreRowsDto,
		columns: DataStoreColumn[],
	) {
		const dbType = this.dataSource.options.type;
		const { rows, matchFields } = dto;

		if (rows.length === 0) {
			return false;
		}

		const { rowsToInsert, rowsToUpdate } = await this.fetchAndSplitRowsByExistence(
			tableName,
			matchFields,
			rows,
		);

		if (rowsToInsert.length > 0) {
			await this.insertRows(tableName, rowsToInsert, columns);
		}

		if (rowsToUpdate.length > 0) {
			for (const row of rowsToUpdate) {
				// TypeORM cannot infer the columns for a dynamic table name, so we use a raw query
				const [query, parameters] = buildUpdateQuery(tableName, row, columns, matchFields, dbType);
				await this.dataSource.query(query, parameters);
			}
		}

		return true;
	}

	async createTableWithColumns(
		tableName: string,
		columns: DataStoreColumn[],
		queryRunner: QueryRunner,
	) {
		const dslColumns = [new DslColumn('id').int.autoGenerate2.primary, ...toDslColumns(columns)];
		const createTable = new CreateTable(tableName, '', queryRunner);
		createTable.withColumns.apply(createTable, dslColumns);
		await createTable.execute(queryRunner);
	}

	async ensureTableAndAddColumn(
		dataStoreId: string,
		column: DataStoreColumn,
		queryRunner: QueryRunner,
		dbType: DataSourceOptions['type'],
	) {
		const tableName = toTableName(dataStoreId);
		const tableExists = await queryRunner.hasTable(tableName);
		if (!tableExists) {
			await this.createTableWithColumns(tableName, [column], queryRunner);
		} else {
			await queryRunner.manager.query(addColumnQuery(tableName, column, dbType));
		}
	}

	async dropColumnFromTable(
		dataStoreId: string,
		columnName: string,
		em: EntityManager,
		dbType: DataSourceOptions['type'],
	) {
		await em.query(deleteColumnQuery(toTableName(dataStoreId), columnName, dbType));
	}

	async getManyAndCount(dataStoreId: DataStoreUserTableName, dto: ListDataStoreContentQueryDto) {
		const [countQuery, query] = this.getManyQuery(dataStoreId, dto);
		const data: DataStoreRows = await query.select('*').getRawMany();
		const countResult = await countQuery.select('COUNT(*) as count').getRawOne<{
			count: number | string | null;
		}>();
		const count =
			typeof countResult?.count === 'number' ? countResult.count : Number(countResult?.count) || 0;
		return { count: count ?? -1, data };
	}

	async getRowIds(dataStoreId: DataStoreUserTableName, dto: ListDataStoreContentQueryDto) {
		const [_, query] = this.getManyQuery(dataStoreId, dto);
		const result = await query.select('dataStore.id').getRawMany<number>();
		return result;
	}

	private getManyQuery(
		dataStoreTableName: DataStoreUserTableName,
		dto: ListDataStoreContentQueryDto,
	): [QueryBuilder, QueryBuilder] {
		const query = this.dataSource.createQueryBuilder();

		query.from(dataStoreTableName, 'dataStore');
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
			// query.orderBy('dataStore.', 'DESC');
			return;
		}

		const [field, order] = dto.sortBy;
		this.applySortingByField(query, field, order);
	}

	private applySortingByField(query: QueryBuilder, field: string, direction: 'DESC' | 'ASC'): void {
		const dbType = this.dataSource.options.type;
		const quotedField = `dataStore.${quoteIdentifier(field, dbType)}`;
		query.orderBy(quotedField, direction);
	}

	private applyPagination(query: QueryBuilder, dto: ListDataStoreContentQueryDto): void {
		query.skip(dto.skip);
		query.take(dto.take);
	}

	private async fetchAndSplitRowsByExistence(
		tableName: string,
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
		const quotedTableName = quoteIdentifier(tableName, dbType);

		const query = `
        SELECT ${quotedFields}
        FROM ${quotedTableName}
        WHERE ${whereClauses.join(' OR ')}
    `;
		const existing: Array<Record<string, unknown>> = await this.dataSource.query(query, params);

		return splitRowsByExistence(existing, matchFields, rows);
	}
}
