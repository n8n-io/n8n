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
		const { schema, tableName } = this.metadata;
		const esc = (name: string) => dataSource.driver.escape(name);
		this.escapedTableName = schema ? `${esc(schema)}.${esc(tableName)}` : esc(tableName);
	}

	/**
	 * Atomically consume a JTI. Returns `true` if this is the first use
	 * (row inserted), `false` if already consumed (replay attempt).
	 *
	 * Postgres uses a CTE with INSERT...RETURNING + EXISTS in a single query.
	 * SQLite uses a transactional 2-query approach (INSERT OR IGNORE + SELECT
	 * changes()) because the sqlite-pooled driver dispatches WITH-prefixed
	 * queries via `.all()` instead of `.run()`, which breaks DML execution.
	 */
	async atomicConsume(jti: string, expiresAt: Date): Promise<boolean> {
		const esc = (name: string) => this.manager.connection.driver.escape(name);
		const tableName = this.escapedTableName;

		if (this.dbType === 'postgresdb') {
			const [row] = (await this.query(
				`WITH ins AS (
					INSERT INTO ${tableName} (${esc('jti')}, ${esc('expiresAt')}, ${esc('createdAt')})
					VALUES ($1, $2, NOW())
					ON CONFLICT (${esc('jti')}) DO NOTHING
					RETURNING ${esc('jti')}
				)
				SELECT EXISTS (SELECT 1 FROM ins) AS inserted`,
				[jti, expiresAt],
			)) as Array<{ inserted: boolean }>;

			return row.inserted;
		} else if (this.dbType === 'sqlite') {
			const qr = this.manager.connection.createQueryRunner();
			await qr.startTransaction();
			try {
				await qr.query(
					`INSERT OR IGNORE INTO ${tableName} (${esc('jti')}, ${esc('expiresAt')}, ${esc('createdAt')}) VALUES (?, datetime(?), datetime('now'))`,
					[jti, expiresAt.toISOString()],
				);
				const [{ cnt }] = (await qr.query('SELECT changes() as cnt')) as Array<{
					cnt: number;
				}>;
				await qr.commitTransaction();
				return cnt > 0;
			} catch (e) {
				await qr.rollbackTransaction();
				throw e;
			} finally {
				await qr.release();
			}
		}

		assert.fail('Unknown database type');
	}

	/**
	 * Delete expired JTI rows in batches. Returns the number of deleted rows.
	 *
	 * Postgres uses a CTE with DELETE...RETURNING + COUNT(*) in a single query.
	 * SQLite uses a transactional 2-query approach (DELETE + SELECT changes())
	 * for the same reason as atomicConsume (see above).
	 */
	async deleteExpiredBatch(batchSize: number): Promise<number> {
		const esc = (name: string) => this.manager.connection.driver.escape(name);
		const tableName = this.escapedTableName;

		if (this.dbType === 'postgresdb') {
			const [row] = (await this.query(
				`WITH deleted AS (
					DELETE FROM ${tableName}
					WHERE ${esc('jti')} IN (
						SELECT ${esc('jti')} FROM ${tableName}
						WHERE ${esc('expiresAt')} < NOW()
						LIMIT $1
					)
					RETURNING ${esc('jti')}
				)
				SELECT COUNT(*) AS ${esc('count')} FROM deleted`,
				[batchSize],
			)) as Array<{ count: string | number }>;

			return Number(row.count);
		} else if (this.dbType === 'sqlite') {
			const qr = this.manager.connection.createQueryRunner();
			await qr.startTransaction();
			try {
				await qr.query(
					`DELETE FROM ${tableName} WHERE ${esc('jti')} IN (
						SELECT ${esc('jti')} FROM ${tableName}
						WHERE ${esc('expiresAt')} < datetime('now')
						LIMIT ?
					)`,
					[batchSize],
				);
				const [{ cnt }] = (await qr.query('SELECT changes() as cnt')) as Array<{
					cnt: number;
				}>;
				await qr.commitTransaction();
				return Number(cnt);
			} catch (e) {
				await qr.rollbackTransaction();
				throw e;
			} finally {
				await qr.release();
			}
		}

		assert.fail('Unknown database type');
	}
}
