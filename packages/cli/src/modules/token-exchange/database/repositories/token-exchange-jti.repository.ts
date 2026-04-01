import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import assert from 'node:assert';

import { TokenExchangeJti } from '../entities/token-exchange-jti.entity';

@Service()
export class TokenExchangeJtiRepository extends Repository<TokenExchangeJti> {
	private readonly dbType: 'postgresdb' | 'sqlite';

	private readonly escapedTableName: string;

	constructor(dataSource: DataSource, globalConfig: GlobalConfig) {
		super(TokenExchangeJti, dataSource.manager);
		this.dbType = globalConfig.database.type;
		this.escapedTableName = this.manager.connection.driver.escape('token_exchange_jti');
	}

	/**
	 * Atomically consume a JTI. Returns `true` if this is the first use
	 * (row inserted), `false` if already consumed (replay attempt).
	 *
	 * Uses a CTE so both Postgres and SQLite return a single `{ inserted: boolean }`
	 * row in one query. The INSERT uses ON CONFLICT / OR IGNORE with RETURNING
	 * inside the CTE, and the outer SELECT checks whether a row was produced.
	 */
	async atomicConsume(jti: string, expiresAt: Date): Promise<boolean> {
		const e = (name: string) => this.manager.connection.driver.escape(name);
		const t = this.escapedTableName;

		if (this.dbType === 'postgresdb') {
			const [row] = (await this.query(
				`WITH ins AS (
					INSERT INTO ${t} (${e('jti')}, ${e('expiresAt')}, ${e('createdAt')})
					VALUES ($1, $2, NOW())
					ON CONFLICT (${e('jti')}) DO NOTHING
					RETURNING ${e('jti')}
				)
				SELECT EXISTS (SELECT 1 FROM ins) AS inserted`,
				[jti, expiresAt],
			)) as Array<{ inserted: boolean }>;

			return row.inserted;
		} else if (this.dbType === 'sqlite') {
			const [row] = (await this.query(
				`WITH ins AS (
					INSERT OR IGNORE INTO ${t} (${e('jti')}, ${e('expiresAt')}, ${e('createdAt')})
					VALUES (?, ?, datetime('now'))
					RETURNING ${e('jti')}
				)
				SELECT EXISTS (SELECT 1 FROM ins) AS inserted`,
				[jti, expiresAt.toISOString()],
			)) as Array<{ inserted: number }>;

			// SQLite returns 0/1 for boolean expressions
			return row.inserted === 1;
		}

		assert.fail('Unknown database type');
	}

	/**
	 * Delete expired JTI rows in batches. Returns the number of deleted rows.
	 *
	 * Uses a CTE with DELETE...RETURNING + COUNT(*) so both Postgres and SQLite
	 * reliably return the deleted count in a single query (same pattern as atomicConsume).
	 */
	async deleteExpiredBatch(batchSize: number): Promise<number> {
		const e = (name: string) => this.manager.connection.driver.escape(name);
		const t = this.escapedTableName;
		const now = this.dbType === 'postgresdb' ? 'NOW()' : "datetime('now')";
		const param = this.dbType === 'postgresdb' ? '$1' : '?';

		const [row] = (await this.query(
			`WITH deleted AS (
				DELETE FROM ${t}
				WHERE ${e('jti')} IN (
					SELECT ${e('jti')} FROM ${t}
					WHERE ${e('expiresAt')} < ${now}
					LIMIT ${param}
				)
				RETURNING ${e('jti')}
			)
			SELECT COUNT(*) AS ${e('count')} FROM deleted`,
			[batchSize],
		)) as Array<{ count: string | number }>;

		return Number(row.count);
	}
}
