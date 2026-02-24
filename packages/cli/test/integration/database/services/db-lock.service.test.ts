import { GlobalConfig } from '@n8n/config';
import { testDb } from '@n8n/backend-test-utils';
import { DbLock, DbLockService } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { OperationalError, sleep } from 'n8n-workflow';

let dbLockService: DbLockService;
let dataSource: DataSource;
let isPostgres: boolean;

beforeAll(async () => {
	await testDb.init();
	dbLockService = Container.get(DbLockService);
	dataSource = Container.get(DataSource);
	isPostgres = Container.get(GlobalConfig).database.type === 'postgresdb';
});

afterAll(async () => {
	await testDb.terminate();
});

describe('DbLockService', () => {
	describe('withLock', () => {
		it('should execute the callback inside a transaction', async () => {
			const result = await dbLockService.withLock(DbLock.TEST, async (tx) => {
				expect(tx).toBeDefined();
				expect(tx.queryRunner).toBeDefined();
				return 'done';
			});

			expect(result).toBe('done');
		});

		it('should return the value from the callback', async () => {
			const result = await dbLockService.withLock(DbLock.TEST, async () => 42);
			expect(result).toBe(42);
		});

		it('should roll back the transaction when the callback throws', async () => {
			await expect(
				dbLockService.withLock(DbLock.TEST, async () => {
					throw new Error('rollback me');
				}),
			).rejects.toThrow('rollback me');
		});
	});

	describe('tryWithLock', () => {
		it('should execute the callback when no contention', async () => {
			const result = await dbLockService.tryWithLock(DbLock.TEST, async (tx) => {
				expect(tx).toBeDefined();
				return 'acquired';
			});

			expect(result).toBe('acquired');
		});
	});

	describe('advisory lock serialization (Postgres)', () => {
		it('should serialize concurrent withLock calls', async () => {
			if (!isPostgres) return;

			const executionOrder: string[] = [];

			// First call: acquires lock, holds it for 200ms
			const first = dbLockService.withLock(DbLock.TEST, async () => {
				executionOrder.push('first:start');
				await sleep(200);
				executionOrder.push('first:end');
				return 'first';
			});

			// Small delay to ensure the first call starts first
			await sleep(50);

			// Second call: should block until first releases the lock
			const second = dbLockService.withLock(DbLock.TEST, async () => {
				executionOrder.push('second:start');
				return 'second';
			});

			const results = await Promise.all([first, second]);

			expect(results).toEqual(['first', 'second']);
			// The second call should only start after the first call ends
			expect(executionOrder).toEqual(['first:start', 'first:end', 'second:start']);
		});

		it('should throw OperationalError when withLock times out', async () => {
			if (!isPostgres) return;

			// Hold the lock in a separate transaction using raw SQL
			// so we can control when it releases
			const holdLockPromise = dataSource.manager.transaction(async (tx) => {
				await tx.query('SELECT pg_advisory_xact_lock($1)', [DbLock.TEST]);
				// Hold the lock longer than the timeout
				await sleep(2000);
			});

			// Wait for the lock to be acquired
			await sleep(100);

			// Try to acquire with a short timeout — should fail
			await expect(
				dbLockService.withLock(DbLock.TEST, async () => 'should not reach', {
					timeoutMs: 200,
				}),
			).rejects.toThrow(OperationalError);

			// Clean up: wait for the lock holder to finish
			await holdLockPromise;
		});

		it('should throw OperationalError when tryWithLock cannot acquire', async () => {
			if (!isPostgres) return;

			let tryResult: unknown;

			await dataSource.manager.transaction(async (tx) => {
				// Hold the advisory lock inside this transaction
				await tx.query('SELECT pg_advisory_xact_lock($1)', [DbLock.TEST]);

				// While the lock is held, tryWithLock should fail immediately
				tryResult = await dbLockService
					.tryWithLock(DbLock.TEST, async () => 'should not reach')
					.catch((e: unknown) => e);
			});

			expect(tryResult).toBeInstanceOf(OperationalError);
			expect((tryResult as OperationalError).message).toMatch(/already held by another process/);
		});

		it('tryWithLock should succeed when lock is not held', async () => {
			if (!isPostgres) return;

			const result = await dbLockService.tryWithLock(DbLock.TEST, async () => 'free');
			expect(result).toBe('free');
		});
	});
});
