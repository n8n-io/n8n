import { testDb, testModules } from '@n8n/backend-test-utils';
import { DbConnectionOptions } from '@n8n/db';
import { Container } from '@n8n/di';
import type { QueryRunner } from '@n8n/typeorm';
import { DataSource, LessThan, MoreThanOrEqual } from '@n8n/typeorm';

import { TokenExchangeJtiRepository } from '@/modules/token-exchange/database/repositories/token-exchange-jti.repository';

const isPostgres = process.env.DB_TYPE === 'postgresdb';
const hour = 60 * 60 * 1000;

describe('TokenExchangeJtiRepository', () => {
	let repository: TokenExchangeJtiRepository;
	let secondaryDataSource: DataSource | undefined;
	let table: string;

	beforeAll(async () => {
		await testModules.loadModules(['token-exchange']);
		await testDb.init();
		repository = Container.get(TokenExchangeJtiRepository);
		const { schema, tableName } = repository.metadata;
		const esc = (name: string): string => repository.manager.connection.driver.escape(name);
		table = schema ? `${esc(schema)}.${esc(tableName)}` : esc(tableName);
		if (isPostgres) {
			secondaryDataSource = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await secondaryDataSource.initialize();
		}
	});

	afterEach(async () => {
		await testDb.truncate(['TokenExchangeJti']);
	});

	afterAll(async () => {
		if (secondaryDataSource?.isInitialized) {
			await secondaryDataSource.destroy();
		}
		await testDb.terminate();
	});

	async function insertRows(prefix: string, count: number, expiresAt: Date): Promise<void> {
		await repository.insert(
			Array.from({ length: count }, (_, i) => ({
				jti: `${prefix}-${i}`,
				expiresAt,
				createdAt: expiresAt,
			})),
		);
	}

	async function counts(): Promise<{ expired: number; valid: number }> {
		const now = new Date();
		return {
			expired: await repository.count({ where: { expiresAt: LessThan(now) } }),
			valid: await repository.count({ where: { expiresAt: MoreThanOrEqual(now) } }),
		};
	}

	describe('atomicConsume', () => {
		const futureDate = new Date(Date.now() + 60 * 60 * 1000);

		it('should return true on first consume of a JTI', async () => {
			const result = await repository.atomicConsume('jti-1', futureDate);

			expect(result).toBe(true);
		});

		it('should return false when the same JTI is consumed again', async () => {
			await repository.atomicConsume('jti-1', futureDate);

			const result = await repository.atomicConsume('jti-1', futureDate);

			expect(result).toBe(false);
		});

		it('should persist the row in the database', async () => {
			await repository.atomicConsume('jti-persisted', futureDate);

			const row = await repository.findOneBy({ jti: 'jti-persisted' });

			expect(row).not.toBeNull();
			expect(row!.jti).toBe('jti-persisted');
		});

		it('should allow consuming different JTIs independently', async () => {
			const result1 = await repository.atomicConsume('jti-a', futureDate);
			const result2 = await repository.atomicConsume('jti-b', futureDate);

			expect(result1).toBe(true);
			expect(result2).toBe(true);
		});

		it('should allow only one consumer when called concurrently with the same JTI', async () => {
			const results = await Promise.all([
				repository.atomicConsume('jti-race', futureDate),
				repository.atomicConsume('jti-race', futureDate),
			]);

			const consumed = results.filter(Boolean);
			expect(consumed).toHaveLength(1);
		});
	});

	describe('deleteExpiredBatch', () => {
		it('should return 0 when table is empty', async () => {
			const deleted = await repository.deleteExpiredBatch(100);

			expect(deleted).toBe(0);
		});

		it('should delete expired rows and return count', async () => {
			const pastDate = new Date(Date.now() - 60 * 1000);
			await repository.atomicConsume('expired-1', pastDate);
			await repository.atomicConsume('expired-2', pastDate);

			const deleted = await repository.deleteExpiredBatch(100);

			expect(deleted).toBe(2);
			expect(await repository.count()).toBe(0);
		});

		it('should not delete rows that have not expired', async () => {
			const futureDate = new Date(Date.now() + 60 * 60 * 1000);
			const pastDate = new Date(Date.now() - 60 * 1000);
			await repository.atomicConsume('still-valid', futureDate);
			await repository.atomicConsume('already-expired', pastDate);

			const deleted = await repository.deleteExpiredBatch(100);

			expect(deleted).toBe(1);
			expect(await repository.findOneBy({ jti: 'still-valid' })).not.toBeNull();
			expect(await repository.findOneBy({ jti: 'already-expired' })).toBeNull();
		});

		it('should respect batch size limit', async () => {
			const pastDate = new Date(Date.now() - 60 * 1000);
			await repository.atomicConsume('exp-1', pastDate);
			await repository.atomicConsume('exp-2', pastDate);
			await repository.atomicConsume('exp-3', pastDate);

			const deleted = await repository.deleteExpiredBatch(2);

			expect(deleted).toBe(2);
			expect(await repository.count()).toBe(1);
		});

		it('should delete each expired row once when batches run concurrently', async () => {
			await insertRows('expired', 2000, new Date(Date.now() - hour));
			await insertRows('valid', 300, new Date(Date.now() + hour));

			const results = await Promise.all(
				Array.from({ length: 4 }, async () => await repository.deleteExpiredBatch(500)),
			);

			const deleted = results.reduce((sum, count) => sum + count, 0);
			const after = await counts();
			expect(deleted + after.expired).toBe(2000);
			expect(after.valid).toBe(300);
		});
	});

	describe('deleteExpiredBatch next to an open transaction on Postgres', () => {
		async function holdTransaction(sql: string): Promise<QueryRunner> {
			const holder = secondaryDataSource!.createQueryRunner();
			await holder.connect();
			await holder.startTransaction();
			await holder.query(sql);
			return holder;
		}

		it.skipIf(!isPostgres)('should not count rows another transaction is deleting', async () => {
			await insertRows('expired', 1000, new Date(Date.now() - hour));
			const holder = await holdTransaction(`DELETE FROM ${table} WHERE "expiresAt" < now()`);

			try {
				const pending = repository.deleteExpiredBatch(1000);
				await new Promise((resolve) => setTimeout(resolve, 300));
				await holder.commitTransaction();
				expect(await pending).toBe(0);
			} finally {
				await holder.release();
			}
			expect((await counts()).expired).toBe(0);
		});

		it.skipIf(!isPostgres)('should delete the rows no other transaction is deleting', async () => {
			await insertRows('expired', 1000, new Date(Date.now() - hour));
			const holder = await holdTransaction(
				`DELETE FROM ${table} WHERE "jti" IN (SELECT "jti" FROM ${table} WHERE "expiresAt" < now() LIMIT 400)`,
			);

			try {
				const pending = repository.deleteExpiredBatch(1000);
				await new Promise((resolve) => setTimeout(resolve, 300));
				await holder.commitTransaction();
				expect(await pending).toBe(600);
			} finally {
				await holder.release();
			}
			expect((await counts()).expired).toBe(0);
		});

		it.skipIf(!isPostgres)(
			'should skip the rows another transaction has locked instead of waiting',
			async () => {
				await insertRows('expired', 1000, new Date(Date.now() - hour));
				const holder = await holdTransaction(
					`SELECT "jti" FROM ${table} WHERE "expiresAt" < now() LIMIT 400 FOR UPDATE`,
				);
				const pending = repository.deleteExpiredBatch(1000);
				let guard: NodeJS.Timeout | undefined;

				try {
					const blocked = new Promise((resolve) => {
						guard = setTimeout(() => resolve('blocked'), 5000);
					});
					expect(await Promise.race([pending, blocked])).toBe(600);
				} finally {
					clearTimeout(guard);
					await holder.commitTransaction();
					await holder.release();
					await pending;
				}
				expect(await repository.deleteExpiredBatch(1000)).toBe(400);
			},
			15_000,
		);
	});
});
