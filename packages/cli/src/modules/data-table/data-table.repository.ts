import {
	DATA_TABLE_COLUMN_ERROR_MESSAGE,
	type DataTableCreateColumnSchema,
	type ListDataTableQueryDto,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Project, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, Repository, SelectQueryBuilder } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';
import type { DataTableInfo, DataTablesSizeData } from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import { DataTableDDLService } from './data-table-ddl.service';
import { DataTable } from './data-table.entity';
import { DataTableUserTableName } from './data-table.types';
import { DataTableNameConflictError } from './errors/data-table-name-conflict.error';
import { DataTableValidationError } from './errors/data-table-validation.error';
import { isValidColumnName, toTableId, toTableName } from './utils/sql-utils';

@Service()
export class DataTableRepository extends Repository<DataTable> {
	constructor(
		dataSource: DataSource,
		private ddlService: DataTableDDLService,
		private readonly globalConfig: GlobalConfig,
	) {
		super(DataTable, dataSource.manager);
	}

	async createDataTable(
		projectId: string,
		name: string,
		columns: DataTableCreateColumnSchema[],
		trx?: EntityManager,
	) {
		return await withTransaction(this.manager, trx, async (em) => {
			if (columns.some((c) => !isValidColumnName(c.name))) {
				throw new DataTableValidationError(DATA_TABLE_COLUMN_ERROR_MESSAGE);
			}

			const dataTable = em.create(DataTable, { name, columns, projectId });

			// @ts-ignore Workaround for intermittent typecheck issue with _QueryDeepPartialEntity
			await em.insert(DataTable, dataTable);
			const dataTableId = dataTable.id;

			// insert columns
			const columnEntities = columns.map((col, index) =>
				em.create(DataTableColumn, {
					dataTableId,
					name: col.name,
					type: col.type,
					index: col.index ?? index,
				}),
			);

			if (columnEntities.length > 0) {
				// @ts-ignore Workaround for intermittent typecheck issue with _QueryDeepPartialEntity
				await em.insert(DataTableColumn, columnEntities);
			}

			// create user table (will create empty table with just id column if no columns)
			await this.ddlService.createTableWithColumns(dataTableId, columnEntities, em);

			if (!dataTableId) {
				throw new UnexpectedError('Data table creation failed');
			}

			const createdDataTable = await em.findOneOrFail(DataTable, {
				where: { id: dataTableId },
				relations: ['project', 'columns'],
			});

			return createdDataTable;
		});
	}

	async deleteDataTable(dataTableId: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			await em.delete(DataTable, { id: dataTableId });
			await this.ddlService.dropTable(dataTableId, em);
			return true;
		});
	}

	async transferDataTableByProjectId(
		fromProjectId: string,
		toProjectId: string,
		trx?: EntityManager,
	) {
		if (fromProjectId === toProjectId) return false;

		return await withTransaction(this.manager, trx, async (em) => {
			const existingTables = await em.findBy(DataTable, { projectId: fromProjectId });

			let transferred = false;
			for (const existing of existingTables) {
				let name = existing.name;
				const hasNameClash = await em.existsBy(DataTable, {
					name,
					projectId: toProjectId,
				});

				if (hasNameClash) {
					const project = await em.findOneByOrFail(Project, { id: fromProjectId });
					name = `${existing.name} (${project.name})`;

					const stillHasNameClash = await em.existsBy(DataTable, {
						name,
						projectId: toProjectId,
					});

					if (stillHasNameClash) {
						throw new DataTableNameConflictError(
							`Failed to transfer data table "${existing.name}" to the target project "${toProjectId}". A data table with the same name already exists in the target project.`,
						);
					}
				}

				await em.update(DataTable, { id: existing.id }, { name, projectId: toProjectId });
				transferred = true;
			}

			return transferred;
		});
	}

	async deleteDataTableByProjectId(projectId: string, trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			const existingTables = await em.findBy(DataTable, { projectId });

			let changed = false;
			for (const match of existingTables) {
				const result = await this.deleteDataTable(match.id, em);
				changed = changed || result;
			}

			return changed;
		});
	}

	async deleteDataTableAll(trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (em) => {
			const existingTables = await em.findBy(DataTable, {});

			let changed = false;
			for (const match of existingTables) {
				const result = await em.delete(DataTable, { id: match.id });
				await this.ddlService.dropTable(match.id, em);
				changed = changed || (result.affected ?? 0) > 0;
			}

			return changed;
		});
	}

	async getManyAndCount(options: Partial<ListDataTableQueryDto>) {
		const query = this.getManyQuery(options);
		const [data, count] = await query.getManyAndCount();
		return { count, data };
	}

	async getMany(options: Partial<ListDataTableQueryDto>) {
		const query = this.getManyQuery(options);
		return await query.getMany();
	}

	private getManyQuery(options: Partial<ListDataTableQueryDto>): SelectQueryBuilder<DataTable> {
		const query = this.createQueryBuilder('dataTable');

		this.applySelections(query);
		this.applyFilters(query, options.filter);
		this.applySorting(query, options.sortBy);
		this.applyPagination(query, options);

		return query;
	}

	private applySelections(query: SelectQueryBuilder<DataTable>): void {
		this.applyDefaultSelect(query);
	}

	private applyFilters(
		query: SelectQueryBuilder<DataTable>,
		filter: Partial<ListDataTableQueryDto>['filter'],
	): void {
		for (const x of ['id', 'projectId'] as const) {
			const content = [filter?.[x]].flat().filter((x) => x !== undefined);
			if (content.length === 0) continue;

			query.andWhere(`dataTable.${x} IN (:...${x}s)`, {
				/*
				 * If list is empty, add a dummy value to prevent an error
				 * when using the IN operator with an empty array.
				 */
				[x + 's']: content.length > 0 ? content : [''],
			});
		}

		if (filter?.name) {
			const nameFilters = Array.isArray(filter.name) ? filter.name : [filter.name];

			nameFilters.forEach((name, i) => {
				query.andWhere(`LOWER(dataTable.name) LIKE LOWER(:name${i})`, {
					['name' + i]: `%${name}%`,
				});
			});
		}
	}

	private applySorting(query: SelectQueryBuilder<DataTable>, sortBy?: string): void {
		if (!sortBy) {
			query.orderBy('dataTable.updatedAt', 'DESC');
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
		query: SelectQueryBuilder<DataTable>,
		field: string,
		direction: 'DESC' | 'ASC',
	): void {
		if (field === 'name') {
			query
				.addSelect('LOWER(dataTable.name)', 'datatable_name_lower')
				.orderBy('datatable_name_lower', direction);
		} else if (['createdAt', 'updatedAt'].includes(field)) {
			query.orderBy(`dataTable.${field}`, direction);
		}
	}

	private applyPagination(
		query: SelectQueryBuilder<DataTable>,
		options: Partial<ListDataTableQueryDto>,
	): void {
		query.skip(options.skip ?? 0);
		if (options.take !== undefined) query.take(options.take);
	}

	private applyDefaultSelect(query: SelectQueryBuilder<DataTable>): void {
		query
			.leftJoinAndSelect('dataTable.project', 'project')
			.leftJoinAndSelect('dataTable.columns', 'data_table_column')
			.select([
				'dataTable',
				...this.getDataTableColumnFields('data_table_column'),
				...this.getProjectFields('project'),
			]);
	}

	private getDataTableColumnFields(alias: string): string[] {
		return [
			`${alias}.id`,
			`${alias}.name`,
			`${alias}.type`,
			`${alias}.createdAt`,
			`${alias}.updatedAt`,
			`${alias}.index`,
		];
	}

	private getProjectFields(alias: string): string[] {
		return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
	}

	private parseSize = (bytes: number | string | null): number =>
		bytes === null ? 0 : typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;

	async findDataTablesSize(): Promise<DataTablesSizeData> {
		const sizeMap = await this.getAllDataTablesSizeMap();

		// Calculate total bytes for the whole instance
		const totalBytes = Array.from(sizeMap.values()).reduce((sum, size) => sum + size, 0);

		const query = this.createQueryBuilder('dt')
			.leftJoinAndSelect('dt.project', 'p')
			.select(['dt.id', 'dt.name', 'p.id', 'p.name']);

		const dataTablesWithProjects = await query.getMany();

		// Combine size data with metadata
		const dataTables: Record<string, DataTableInfo> = {};

		for (const dt of dataTablesWithProjects) {
			const sizeBytes = sizeMap.get(dt.id) ?? 0;
			dataTables[dt.id] = {
				id: dt.id,
				name: dt.name,
				projectId: dt.project.id,
				projectName: dt.project.name,
				sizeBytes,
			};
		}

		return {
			totalBytes,
			dataTables,
		};
	}

	private async getAllDataTablesSizeMap(): Promise<Map<string, number>> {
		const dbType = this.globalConfig.database.type;
		const tablePattern = toTableName('%');

		let sql = '';

		switch (dbType) {
			case 'sqlite':
				sql = `
        WITH data_table_names(name) AS (
          SELECT name
          FROM sqlite_schema
          WHERE type = 'table' AND name GLOB '${toTableName('*')}'
        )
        SELECT t.name AS table_name, (SELECT SUM(pgsize) FROM dbstat WHERE name = t.name) AS table_bytes
        FROM data_table_names AS t
      `;
				break;

			case 'postgresdb': {
				const schemaName = this.globalConfig.database.postgresdb?.schema;
				sql = `
        SELECT c.relname AS table_name, pg_relation_size(c.oid) AS table_bytes
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = '${schemaName}'
           AND c.relname LIKE '${tablePattern}'
           AND c.relkind IN ('r', 'm', 'p')
      `;
				break;
			}

			case 'mysqldb':
			case 'mariadb': {
				const databaseName = this.globalConfig.database.mysqldb.database;
				const isMariaDb = dbType === 'mariadb';
				const innodbTables = isMariaDb ? 'INNODB_SYS_TABLES' : 'INNODB_TABLES';
				const innodbTablespaces = isMariaDb ? 'INNODB_SYS_TABLESPACES' : 'INNODB_TABLESPACES';
				sql = `
        SELECT t.TABLE_NAME AS table_name,
            COALESCE(
                (
                  SELECT SUM(ists.ALLOCATED_SIZE)
                    FROM information_schema.${innodbTables} ist
                    JOIN information_schema.${innodbTablespaces} ists
                      ON ists.SPACE = ist.SPACE
                   WHERE ist.NAME = CONCAT(t.TABLE_SCHEMA, '/', t.TABLE_NAME)
                ),
                (t.DATA_LENGTH + t.INDEX_LENGTH)
            ) AS table_bytes
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = '${databaseName}'
          AND t.TABLE_NAME LIKE '${tablePattern}'
    `;
				break;
			}

			default:
				return new Map<string, number>();
		}

		const result = (await this.query(sql)) as Array<{
			table_name: string;
			table_bytes: number | string | null;
		}>;

		const sizeMap = new Map<string, number>();

		for (const row of result) {
			if (row.table_bytes !== null && row.table_name) {
				const dataTableId = toTableId(row.table_name as DataTableUserTableName);
				const sizeBytes = this.parseSize(row.table_bytes);
				sizeMap.set(dataTableId, (sizeMap.get(dataTableId) ?? 0) + sizeBytes);
			}
		}

		return sizeMap;
	}
}
