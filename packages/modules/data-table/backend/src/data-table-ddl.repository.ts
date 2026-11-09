import { CreateTable, DslColumn, TransactionRunner, runWithEntityManager } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSourceOptions, EntityManager } from '@n8n/typeorm';
import { UnexpectedError } from 'n8n-workflow';

import { DataTableColumn } from './data-table-column.entity';
import {
	addColumnQuery,
	deleteColumnQuery,
	isValidDataTableId,
	renameColumnQuery,
	renameTableQuery,
	toDslColumns,
	toTableName,
} from './utils/sql-utils';

/**
 * Manages database schema operations for data tables (DDL).
 * Handles table creation, deletion, and structural modifications (columns).
 */
@Service()
export class DataTableDDLRepository {
	constructor(private readonly transactionRunner: TransactionRunner) {}

	async createTableWithColumns(
		dataTableId: string,
		columns: DataTableColumn[],
		trx?: EntityManager,
	) {
		await runWithEntityManager(this.transactionRunner, trx, async (em) => {
			if (!em.queryRunner) {
				throw new UnexpectedError('QueryRunner is not available');
			}

			const dslColumns = [new DslColumn('id').int.autoGenerate2.primary, ...toDslColumns(columns)];
			const createTable = new CreateTable(toTableName(dataTableId), '', em.queryRunner).withColumns(
				...dslColumns,
			).withTimestamps;

			await createTable.execute(em.queryRunner);
		});
	}

	async dropTable(dataTableId: string, trx?: EntityManager) {
		await runWithEntityManager(this.transactionRunner, trx, async (em) => {
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
		await runWithEntityManager(this.transactionRunner, trx, async (em) => {
			await em.query(
				renameTableQuery(toTableName(oldDataTableId), toTableName(newDataTableId), dbType),
			);
		});
	}

	async tableExists(dataTableId: string, trx?: EntityManager): Promise<boolean> {
		return await runWithEntityManager(this.transactionRunner, trx, async (em) => {
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
		await runWithEntityManager(this.transactionRunner, trx, async (em) => {
			await em.query(addColumnQuery(toTableName(dataTableId), column, dbType));
		});
	}

	async dropColumnFromTable(
		dataTableId: string,
		columnName: string,
		dbType: DataSourceOptions['type'],
		trx?: EntityManager,
	) {
		await runWithEntityManager(this.transactionRunner, trx, async (em) => {
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
		await runWithEntityManager(this.transactionRunner, trx, async (em) => {
			await em.query(
				renameColumnQuery(toTableName(dataTableId), oldColumnName, newColumnName, dbType),
			);
		});
	}
}
