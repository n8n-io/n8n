import type {
	ListDataStoreContentQueryDto,
	DataStoreUserTableName,
	DataStoreRows,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, SelectQueryBuilder } from '@n8n/typeorm';

import { insertIntoQuery } from './utils/sql-utils';

// type QueryBuilder = SelectQueryBuilder<Record<PropertyKey, unknown>>;
type QueryBuilder = SelectQueryBuilder<any>;
// type QueryBuilder = ReturnType<EntityManager['createQueryBuilder']>;

function valueToSQL(value: ListDataStoreContentQueryDto['filter']['filters'][number]['value']) {
	if (value instanceof Date) {
		return value.toISOString(); // @Review: this feels bad
	}
	switch (typeof value) {
		case 'number':
		case 'boolean':
			return `${value}`;
		case 'string':
			return `'${value}'`;
	}
}

function getConditionSQL(filter: ListDataStoreContentQueryDto['filter']['filters'][number]) {
	switch (filter.condition) {
		case 'eq':
			return `dataStore.${filter.columnName} == ${valueToSQL(filter.value)}`;
		case 'neq':
			return `dataStore.${filter.columnName} != ${valueToSQL(filter.value)}`;
	}
}

@Service()
export class DataStoreRowsRepository {
	constructor(private dataSource: DataSource) {}

	async appendRows(tableName: DataStoreUserTableName, rows: DataStoreRows) {
		await this.dataSource.query(...insertIntoQuery(tableName, rows));
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
		const conditions = dto.filter?.filters.map(getConditionSQL) ?? [];
		if (dto.filter?.type === 'and') {
			for (const condition of conditions) {
				query.andWhere(condition);
			}
		} else if (dto.filter?.type === 'or') {
			for (const condition of conditions) {
				query.orWhere(condition);
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
		console.log(field);
		query.orderBy(`${field}`, direction);
	}

	private applyPagination(query: QueryBuilder, dto: Partial<ListDataStoreContentQueryDto>): void {
		query.skip(dto.skip);
		query.take(dto.take);
	}
}
