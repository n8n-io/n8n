import { CreateTable, DslColumn, withTransaction } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, DataSourceOptions, EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import {
	DATA_TABLE_KANBAN_ORDER_COLUMN,
	DATA_TABLE_KANBAN_ORDER_LENGTH,
} from './data-table.types';
import {
	addColumnQuery,
	deleteColumnQuery,
	isValidDataTableId,
	renameColumnQuery,
	renameTableQuery,
	toDslColumns,
	toKanbanIndexName,
	toTableName,
} from './utils/sql-utils';

/**
 * Manages database schema operations for data tables (DDL).
 * Handles table creation, deletion, and structural modifications (columns).
 */
@Service()
export class DataTableDDLService {
	constructor(private dataSource: DataSource) {}

	async createTableWithColumns(
		dataTableId: string,
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			if (!em.queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			const dslColumns = [
				new DslColumn('id').int.autoGenerate2.primary,
				new DslColumn(DATA_TABLE_KANBAN_ORDER_COLUMN)
					.varchar(DATA_TABLE_KANBAN_ORDER_LENGTH)
					.notNull,
				...toDslColumns(columns),
			];
			const createTable = new CreateTable(toTableName(dataTableId), '', em.queryRunner).withColumns(
				...dslColumns,
			).withTimestamps;

			await createTable.execute(em.queryRunner);
			const tableName = this.dataSource.driver.escape(toTableName(dataTableId));
			const indexName = this.dataSource.driver.escape(toKanbanIndexName(dataTableId));
			const orderColumn = this.dataSource.driver.escape(DATA_TABLE_KANBAN_ORDER_COLUMN);
			const idColumn = this.dataSource.driver.escape('id');
			await em.query(
				`CREATE INDEX ${indexName} ON ${tableName} (${orderColumn} DESC, ${idColumn} DESC)`,
			);
		});
	}

	async replaceKanbanIndex(
		dataTableId: string,
		groupColumnName: string | null,
		trx?: EntityManager,
	): Promise<void> {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			const indexName = this.dataSource.driver.escape(toKanbanIndexName(dataTableId));
			await em.query(`DROP INDEX IF EXISTS ${indexName}`);
			const tableName = this.dataSource.driver.escape(toTableName(dataTableId));
			const orderColumn = this.dataSource.driver.escape(DATA_TABLE_KANBAN_ORDER_COLUMN);
			const idColumn = this.dataSource.driver.escape('id');
			const columns =
				groupColumnName === null
					? `${orderColumn} DESC, ${idColumn} DESC`
					: `${this.dataSource.driver.escape(groupColumnName)}, ${orderColumn} DESC, ${idColumn} DESC`;
			await em.query(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
		});
	}

	async dropTable(dataTableId: string, trx?: EntityManager) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			if (!em.queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}
			await em.queryRunner.dropTable(toTableName(dataTableId), true);
		});
	}

	async renameTable(
		oldDataTableId: string,
		newDataTableId: string,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		// These ids come from git files and the local DB rather than validated
		// API requests, so guard before deriving SQL identifiers from them
		if (!isValidDataTableId(oldDataTableId) || !isValidDataTableId(newDataTableId)) {
			throw new UnexpectedError('Invalid data table ID');
		}
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			await em.query(
				renameTableQuery(toTableName(oldDataTableId), toTableName(newDataTableId), dbType),
			);
		});
	}

	async tableExists(dataTableId: string, trx?: EntityManager): Promise<boolean> {
		return await withTransaction(this.dataSource.manager, trx, async (em) => {
			if (!em.queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}
			return await em.queryRunner.hasTable(toTableName(dataTableId));
		});
	}

	async addColumn(
		dataTableId: string,
		column: DataTableColumn,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			await em.query(addColumnQuery(toTableName(dataTableId), column, dbType));
		});
	}

	async dropColumnFromTable(
		dataTableId: string,
		columnName: string,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			await em.query(deleteColumnQuery(toTableName(dataTableId), columnName, dbType));
		});
	}

	async renameColumn(
		dataTableId: string,
		oldColumnName: string,
		newColumnName: string,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		await withTransaction(this.dataSource.manager, trx, async (em) => {
			await em.query(
				renameColumnQuery(toTableName(dataTableId), oldColumnName, newColumnName, dbType),
			);
		});
	}

}
