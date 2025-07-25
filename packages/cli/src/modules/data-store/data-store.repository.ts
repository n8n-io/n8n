import { Service } from '@n8n/di';
import { DataSource, Repository, SelectQueryBuilder } from '@n8n/typeorm';

import { DataStoreEntity } from './data-store.entity';
import { DataStoreColumn, DataStoreListOptions, DataStoreUserTableName } from './data-store.types';
import { createUserTableQuery } from './utils/sql-utils';

@Service()
export class DataStoreRepository extends Repository<DataStoreEntity> {
	constructor(dataSource: DataSource) {
		super(DataStoreEntity, dataSource.manager);
	}

	async createUserTable(tableName: DataStoreUserTableName, columns: DataStoreColumn[]) {
		await this.manager.query(...createUserTableQuery(tableName, columns));
	}

	async deleteUserTable(tableName: DataStoreUserTableName) {
		await this.manager.query(`DROP TABLE ${tableName}`);
	}

	// ALL THE MANY STUFF
	async getManyAndCount(options: DataStoreListOptions = {}) {
		const query = this.getManyQuery(options);
		return await query.getManyAndCount();
	}

	async getMany(options: DataStoreListOptions = {}) {
		const query = this.getManyQuery(options);
		return await query.getMany();
	}

	getManyQuery(options: DataStoreListOptions = {}): SelectQueryBuilder<DataStoreEntity> {
		const query = this.createQueryBuilder('dataStore');

		this.applySelections(query);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(query: SelectQueryBuilder<DataStoreEntity>): void {
		this.applyDefaultSelect(query);
	}

	private applyFilters(
		query: SelectQueryBuilder<DataStoreEntity>,
		filter: DataStoreListOptions['filter'],
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

		if (filter?.name && typeof filter.name === 'string') {
			query.andWhere('LOWER(dataStore.name) LIKE LOWER(:name)', {
				name: `%${filter.name}%`,
			});
		}
	}

	private applySorting(query: SelectQueryBuilder<DataStoreEntity>, sortBy?: string): void {
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
		query: SelectQueryBuilder<DataStoreEntity>,
		field: string,
		direction: 'DESC' | 'ASC',
	): void {
		console.log(field, direction);
		if (field === 'name') {
			query
				.addSelect('LOWER(dataStore.name)', 'dataStore_name_lower')
				.orderBy('dataStore_name_lower', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`dataStore.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<DataStoreEntity>,
		options: DataStoreListOptions,
	): void {
		query.skip(options.skip ?? 0);
		query.take(options.take ?? 0);
	}

	private applyDefaultSelect(query: SelectQueryBuilder<DataStoreEntity>): void {
		query
			.leftJoinAndSelect('dataStore.project', 'project')
			.leftJoinAndSelect('dataStore.columns', 'data_store_column_entity')
			// .leftJoinAndSelect('dataStore.sizeBytes', 'sizeBytes')
			.select([
				'dataStore',
				...this.getDataStoreColumnFields('data_store_column_entity'),
				...this.getProjectFields('project'),
			]);
	}

	private getDataStoreColumnFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`];
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}
}
