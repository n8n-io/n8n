import {
	BaseRepository,
	dbNowLiteral,
	type OperationContext,
	parseDbTime,
	TransactionRunner,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { McpRegistryServerEntity } from './mcp-registry-server.entity';
import type { McpRegistryServerUpsertRow } from './mcp-registry.types';

const OVERWRITTEN_COLUMNS = ['status', 'version', 'registryUpdatedAt', 'data', 'updatedAt'];

class McpRegistryServerTable extends BaseRepository<McpRegistryServerEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(McpRegistryServerEntity, dataSource.manager, transactionRunner);
	}
}

@Service()
export class McpRegistryServerRepository {
	private readonly table: McpRegistryServerTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new McpRegistryServerTable(dataSource, transactionRunner);
	}

	async findBySlug(slug: string, ctx: OperationContext): Promise<McpRegistryServerEntity | null> {
		return await this.table.managerFor(ctx).findOneBy(McpRegistryServerEntity, { slug });
	}

	async findBySlugs(slugs: string[], ctx: OperationContext): Promise<McpRegistryServerEntity[]> {
		if (slugs.length === 0) {
			return [];
		}

		return await this.table.managerFor(ctx).findBy(McpRegistryServerEntity, { slug: In(slugs) });
	}

	async findAll(ctx: OperationContext): Promise<McpRegistryServerEntity[]> {
		return await this.table.managerFor(ctx).find(McpRegistryServerEntity);
	}

	async findActive(ctx: OperationContext): Promise<McpRegistryServerEntity[]> {
		return await this.table.managerFor(ctx).findBy(McpRegistryServerEntity, { status: 'active' });
	}

	/** Current time on the database clock, shared by every instance. */
	async readDbNow(ctx: OperationContext): Promise<Date> {
		const manager = this.table.managerFor(ctx);
		const isPostgres = manager.connection.options.type === 'postgres';
		const [row]: Array<{ dbNow: Date | string }> = await manager.query(
			`SELECT ${dbNowLiteral(isPostgres)} AS "dbNow"`,
		);
		return parseDbTime(row.dbNow);
	}

	/**
	 * Inserts or updates the rows by slug in one statement, and stamps them with
	 * `fetchedAt`. An existing row is only overwritten by a newer fetch than the
	 * one that last wrote it, so overlapping writes keep the newest fetch.
	 * `fetchedAt` must come from `readDbNow()` before the fetch starts, and every
	 * other writer of `updatedAt` must use the database clock too.
	 */
	async upsertFetchedServers(
		rows: McpRegistryServerUpsertRow[],
		fetchedAt: Date,
		ctx: OperationContext,
	): Promise<void> {
		if (rows.length > 0) {
			const manager = this.table.managerFor(ctx);
			const escape = (column: string) => manager.connection.driver.escape(column);
			const overwrite = OVERWRITTEN_COLUMNS.map(
				(column) => `${escape(column)} = EXCLUDED.${escape(column)}`,
			).join(', ');
			// A fixed row order makes overlapping writes lock rows in the same order.
			const values = [...rows]
				.sort((a, b) => (a.slug < b.slug ? -1 : 1))
				.map((row) => ({ ...row, updatedAt: fetchedAt }));

			const storedUpdatedAt = `${escape(this.table.metadata.tableName)}.${escape('updatedAt')}`;

			// An alias equal to the table path stops the Postgres `AS` alias,
			// so the WHERE can refer to the stored row by its table name.
			await manager
				.createQueryBuilder(McpRegistryServerEntity, this.table.metadata.tablePath)
				.insert()
				.values(values)
				// Deprecated, but `orUpdate` cannot express the conditional WHERE.
				// oxlint-disable-next-line typescript/no-deprecated
				.onConflict(
					`(${escape('slug')}) DO UPDATE SET ${overwrite} WHERE ${storedUpdatedAt} < EXCLUDED.${escape('updatedAt')}`,
				)
				.execute();
		}
	}

	/** Replaces all stored server rows in one transaction. */
	async replaceAll(rows: McpRegistryServerUpsertRow[], ctx: OperationContext): Promise<void> {
		await this.table.runInTransaction(ctx, async (tx) => {
			await tx.createQueryBuilder().delete().from(McpRegistryServerEntity).execute();
			if (rows.length > 0) {
				await tx.insert(McpRegistryServerEntity, rows);
			}
		});
	}
}
