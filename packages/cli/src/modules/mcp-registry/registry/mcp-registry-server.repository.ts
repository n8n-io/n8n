import { dbNowLiteral, parseDbTime } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { McpRegistryServerEntity } from './mcp-registry-server.entity';
import type { McpRegistryServerUpsertRow } from './mcp-registry.types';

const OVERWRITTEN_COLUMNS = ['status', 'version', 'registryUpdatedAt', 'data', 'updatedAt'];

@Service()
export class McpRegistryServerRepository extends Repository<McpRegistryServerEntity> {
	constructor(dataSource: DataSource) {
		super(McpRegistryServerEntity, dataSource.manager);
	}

	/** Current time on the database clock, shared by every instance. */
	async readDbNow(): Promise<Date> {
		const isPostgres = this.manager.connection.options.type === 'postgres';
		const [row]: Array<{ dbNow: Date | string }> = await this.query(
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
	async upsertFetchedServers(rows: McpRegistryServerUpsertRow[], fetchedAt: Date): Promise<void> {
		if (rows.length > 0) {
			const escape = (column: string) => this.manager.connection.driver.escape(column);
			// A fixed row order makes overlapping writes lock rows in the same order.
			const values = [...rows]
				.sort((a, b) => (a.slug < b.slug ? -1 : 1))
				.map((row) => ({ ...row, updatedAt: fetchedAt }));

			const storedUpdatedAt = `${escape(this.metadata.tableName)}.${escape('updatedAt')}`;

			// An alias equal to the table path stops the Postgres `AS` alias.
			const [query, parameters] = this.createQueryBuilder(this.metadata.tablePath)
				.insert()
				.values(values)
				.orUpdate(OVERWRITTEN_COLUMNS, ['slug'])
				.getQueryAndParameters();
			await this.query(
				`${query} WHERE ${storedUpdatedAt} < EXCLUDED.${escape('updatedAt')}`,
				parameters,
			);
		}
	}
}
