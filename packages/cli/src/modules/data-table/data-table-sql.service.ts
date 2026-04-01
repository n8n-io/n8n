import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import { OperationalError } from 'n8n-workflow';

import { DataTableColumnRepository } from './data-table-column.repository';
import { DataTableRepository } from './data-table.repository';
import { toTableName } from './utils/sql-utils';
import { SqlValidator } from './utils/sql-validator';

export type TableSchema = {
	id: string;
	name: string;
	columns: Array<{ name: string; type: string }>;
};

export type SqlQueryResult = {
	rows: Array<Record<string, unknown>>;
	rowCount: number;
	truncated: boolean;
};

export type SqlExecutionOptions = {
	maxRows?: number;
	timeoutMs?: number;
};

const DEFAULT_MAX_ROWS = 100;
const DEFAULT_TIMEOUT_MS = 10_000;

@Service()
export class DataTableSqlService {
	private readonly logger: Logger;

	constructor(
		private readonly dataSource: DataSource,
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableColumnRepository: DataTableColumnRepository,
		logger: Logger,
	) {
		this.logger = logger.scoped('data-table');
	}

	/**
	 * Load table schemas (metadata + columns) for the given table IDs within a project.
	 */
	async getTableSchemas(tableIds: string[], projectId: string): Promise<TableSchema[]> {
		const tables = await this.dataTableRepository.find({
			where: { id: In(tableIds), projectId },
		});

		if (tables.length === 0) {
			return [];
		}

		const foundIds = tables.map((t) => t.id);
		const columns = await this.dataTableColumnRepository.find({
			where: { dataTableId: In(foundIds) },
		});

		// Group columns by dataTableId
		const columnsByTableId = new Map<string, Array<{ name: string; type: string }>>();
		for (const col of columns) {
			const existing = columnsByTableId.get(col.dataTableId) ?? [];
			existing.push({ name: col.name, type: col.type });
			columnsByTableId.set(col.dataTableId, existing);
		}

		return tables.map((table) => ({
			id: table.id,
			name: table.name,
			columns: columnsByTableId.get(table.id) ?? [],
		}));
	}

	/**
	 * Validate SQL, rewrite table names to physical names, and execute on a
	 * read-only connection. Returns sanitized rows with truncation info.
	 */
	async validateAndExecute(
		sql: string,
		tableIds: string[],
		projectId: string,
		options: SqlExecutionOptions = {},
	): Promise<SqlQueryResult> {
		const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
		const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

		// 1. Load tables from DB to build logical→physical name mapping
		const tables = await this.dataTableRepository.find({
			where: { id: In(tableIds), projectId },
		});

		// Build logical name → physical name mapping, handling name collisions
		// by appending _2 suffix for the second occurrence.
		const tableMapping = new Map<string, string>();
		const logicalNames: string[] = [];
		const seenNames = new Map<string, number>();

		for (const table of tables) {
			const physicalName = toTableName(table.id);
			const baseName = table.name.toLowerCase();
			const count = seenNames.get(baseName) ?? 0;
			seenNames.set(baseName, count + 1);

			const logicalName = count === 0 ? baseName : `${baseName}_${count + 1}`;
			tableMapping.set(logicalName, physicalName);
			logicalNames.push(logicalName);
		}

		// 2. Validate and rewrite SQL
		const dbType = this.dataSource.options.type;
		const validator = new SqlValidator(dbType);
		const { rewrittenSql } = validator.validateAndRewrite(sql, logicalNames, tableMapping);

		// 3. Apply LIMIT
		const limitedSql = this.ensureLimit(rewrittenSql, maxRows);

		// 4. Execute on read-only connection
		const rawRows = await this.executeReadOnly(limitedSql, timeoutMs);

		// 5. Apply row cap and detect truncation
		const truncated = rawRows.length > maxRows;
		const rows = truncated ? rawRows.slice(0, maxRows) : rawRows;

		return {
			rows,
			rowCount: rows.length,
			truncated,
		};
	}

	/**
	 * Append or cap the LIMIT clause in a SQL string.
	 * Uses maxRows + 1 so we can detect truncation.
	 */
	ensureLimit(sql: string, maxRows: number): string {
		const fetchLimit = maxRows + 1;
		// Match trailing LIMIT <number> (possibly with semicolon)
		const limitRegex = /\bLIMIT\s+(\d+)\s*;?\s*$/i;
		const match = limitRegex.exec(sql);

		if (match) {
			const existing = parseInt(match[1], 10);
			if (existing > fetchLimit) {
				// Replace existing limit with the cap
				return sql.replace(limitRegex, `LIMIT ${fetchLimit}`);
			}
			// Existing limit is already within bounds; leave it
			return sql;
		}

		// No LIMIT present — append one
		return `${sql.trimEnd()} LIMIT ${fetchLimit}`;
	}

	/**
	 * Execute a SQL query on a read-only connection.
	 *
	 * For PostgreSQL: uses a transaction set to READ ONLY with a statement timeout.
	 * For SQLite: executes directly (AST validation is the primary guard).
	 */
	private async executeReadOnly(
		sql: string,
		timeoutMs: number,
	): Promise<Array<Record<string, unknown>>> {
		const dbType = this.dataSource.options.type;

		if (dbType === 'postgres') {
			return await this.executePostgresReadOnly(sql, timeoutMs);
		}

		// SQLite — execute directly via manager
		return await this.executeSqliteDirect(sql);
	}

	private async executePostgresReadOnly(
		sql: string,
		timeoutMs: number,
	): Promise<Array<Record<string, unknown>>> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			await queryRunner.query('SET TRANSACTION READ ONLY');
			await queryRunner.query(`SET LOCAL statement_timeout = ${timeoutMs}`);
			const result = (await queryRunner.query(sql)) as Array<Record<string, unknown>>;
			await queryRunner.rollbackTransaction();
			return result;
		} catch (error) {
			await queryRunner.rollbackTransaction().catch((rollbackErr: unknown) => {
				this.logger.warn('Failed to rollback read-only transaction', { rollbackErr });
			});
			throw this.sanitizeDbError(error);
		} finally {
			await queryRunner.release().catch((releaseErr: unknown) => {
				this.logger.warn('Failed to release query runner', { releaseErr });
			});
		}
	}

	private async executeSqliteDirect(sql: string): Promise<Array<Record<string, unknown>>> {
		try {
			return await this.dataSource.manager.query(sql);
		} catch (error) {
			throw this.sanitizeDbError(error);
		}
	}

	/**
	 * Replace physical table name patterns in error messages to avoid leaking
	 * internal naming to the caller.
	 */
	sanitizeDbError(error: unknown): unknown {
		if (!(error instanceof Error)) {
			return error;
		}

		const sanitized = error.message.replace(/n8n_data_table_user_\S*/g, '[table]');

		if (sanitized === error.message) {
			return error;
		}

		const newError = new OperationalError(sanitized);
		newError.stack = error.stack;
		return newError;
	}
}
