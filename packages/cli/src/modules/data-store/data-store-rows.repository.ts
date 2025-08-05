import type {
	ListDataStoreContentQueryDto,
	DataStoreUserTableName,
	UpsertDataStoreRowsDto,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, DataSourceOptions, SelectQueryBuilder } from '@n8n/typeorm';
import type { DataStoreRows } from 'n8n-workflow';

import {
	buildInsertQuery,
	buildUpdateQuery,
	quoteIdentifier,
	splitRowsByExistence,
} from './utils/sql-utils';

type QueryBuilder = SelectQueryBuilder<any>;

function getConditionAndParams(
	filter: ListDataStoreContentQueryDto['filter']['filters'][number],
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

	async insertRows(tableName: DataStoreUserTableName, rows: DataStoreRows) {
		const dbType = this.dataSource.options.type;
		await this.dataSource.query(...buildInsertQuery(tableName, rows, dbType));
		return true;
	}

	async upsertRows(tableName: DataStoreUserTableName, dto: UpsertDataStoreRowsDto) {
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
			await this.insertRows(tableName, rowsToInsert);
		}

		if (rowsToUpdate.length > 0) {
			for (const row of rowsToUpdate) {
				const [query, parameters] = buildUpdateQuery(tableName, row, matchFields, dbType);
				await this.dataSource.query(query, parameters);
			}
		}

		return true;
	}

	async getManyAndCount(
		dataStoreId: DataStoreUserTableName,
		dto: Partial<ListDataStoreContentQueryDto>,
	) {
		const [countQuery, query] = this.getManyQuery(dataStoreId, dto);
		const data = await query.select('*').getRawMany();
		const count = (await countQuery.select('COUNT(*)').getRawOne())['COUNT(*)'] as
			| number
			| undefined;
		return { count: count ?? -1, data };
	}

	async getRowIds(dataStoreId: DataStoreUserTableName, dto: Partial<ListDataStoreContentQueryDto>) {
		const [_, query] = this.getManyQuery(dataStoreId, dto);
		const result = await query.select('dataStore.id').getRawMany();
		return result as number[];
	}

	private getManyQuery(
		dataStoreId: DataStoreUserTableName,
		dto: Partial<ListDataStoreContentQueryDto>,
	): [QueryBuilder, QueryBuilder] {
		const query = this.dataSource.createQueryBuilder();

		query.from(dataStoreId, 'dataStore');
		this.applyFilters(query, dto);
		const countQuery = query.clone().select('COUNT(*)');
		this.applySorting(query, dto);
		this.applyPagination(query, dto);

		return [countQuery, query];
	}

	private applyFilters(query: QueryBuilder, dto: Partial<ListDataStoreContentQueryDto>): void {
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

	private applySorting(query: QueryBuilder, dto: Partial<ListDataStoreContentQueryDto>): void {
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

	private applyPagination(query: QueryBuilder, dto: Partial<ListDataStoreContentQueryDto>): void {
		query.skip(dto.skip);
		query.take(dto.take);
	}

	private async fetchAndSplitRowsByExistence(
		tableName: string,
		matchFields: string[],
		rows: DataStoreRows,
	): Promise<{ rowsToInsert: DataStoreRows; rowsToUpdate: DataStoreRows }> {
		const whereClauses: string[] = [];
		const params: unknown[] = [];

		for (const row of rows) {
			const clause = matchFields
				.map((field) => {
					params.push(row[field]);
					return `"${field}" = $${params.length}`;
				})
				.join(' AND ');
			whereClauses.push(`(${clause})`);
		}

		const query = `
		SELECT ${matchFields.map((field) => `"${field}"`).join(', ')}
		FROM "${tableName}"
		WHERE ${whereClauses.join(' OR ')}
	`;

		const existing: Array<Record<string, unknown>> = await this.dataSource.query(query, params);

		return splitRowsByExistence(existing, matchFields, rows);
	}
}
