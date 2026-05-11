import { GlobalConfig } from '@n8n/config';
import { testDb } from '@n8n/backend-test-utils';
import { DbConnectionOptions, DbLock, DbLockService } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { OperationalError, sleep } from 'n8n-workflow';

let dbLockService: DbLockService;
let isPostgres: boolean;

// Separate DataSource with its own connection for holding locks during
// contention tests. The main DataSource may have poolSize=1 in CI
// (set by setup-testcontainers.js), so we need an independent connection
// to hold a lock while the service tries to acquire it on the main pool.
let holdLockDs: DataSource;

beforeAll(async () => {
	await testDb.init();
	dbLockService = Container.get(DbLockService);
	const globalConfig = Container.get(GlobalConfig);
	isPostgres = globalConfig.database.type === 'postgresdb';

	if (isPostgres) {
		holdLockDs = new DataSource({
			type: 'postgres',
			...Container.get(DbConnectionOptions).getPostgresOverrides(),
			schema: globalConfig.database.postgresdb.schema,
		});
		await holdLockDs.initialize();
	}
});

afterAll(async () => {
	if (holdLockDs?.isInitialized) {
		await holdLockDs.destroy();
	}
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

			let lockAcquired!: () => void;
			const lockAcquiredPromise = new Promise<void>((resolve) => {
				lockAcquired = resolve;
			});

			// First call: hold lock on the separate connection
			const first = holdLockDs.manager.transaction(async (tx) => {
				await tx.query('SELECT pg_advisory_xact_lock($1)', [DbLock.TEST]);
				executionOrder.push('first:start');
				lockAcquired();
				await sleep(300);
				executionOrder.push('first:end');
				return 'first';
			});

			await lockAcquiredPromise;

			// Second call via the service: should block until first releases the lock
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

			let lockAcquired!: () => void;
			const lockAcquiredPromise = new Promise<void>((resolve) => {
				lockAcquired = resolve;
			});

			// Hold the lock on the separate connection
			const holdLockPromise = holdLockDs.manager.transaction(async (tx) => {
				await tx.query('SELECT pg_advisory_xact_lock($1)', [DbLock.TEST]);
				lockAcquired();
				await sleep(2000);
			});

			await lockAcquiredPromise;

			// Try to acquire on the main connection with a short timeout — should fail
			await expect(
				dbLockService.withLock(DbLock.TEST, async () => 'should not reach', {
					timeoutMs: 200,
				}),
			).rejects.toThrow(OperationalError);

			await holdLockPromise;
		});

		it('should throw OperationalError when tryWithLock cannot acquire', async () => {
			if (!isPostgres) return;

			let lockAcquired!: () => void;
			const lockAcquiredPromise = new Promise<void>((resolve) => {
				lockAcquired = resolve;
			});

			// Hold the lock on the separate connection
			const holdLockPromise = holdLockDs.manager.transaction(async (tx) => {
				await tx.query('SELECT pg_advisory_xact_lock($1)', [DbLock.TEST]);
				lockAcquired();
				await sleep(2000);
			});

			await lockAcquiredPromise;

			// tryWithLock on the main connection should fail immediately
			const error = await dbLockService
				.tryWithLock(DbLock.TEST, async () => 'should not reach')
				.catch((e: unknown) => e);

			expect(error).toBeInstanceOf(OperationalError);
			expect((error as OperationalError).message).toMatch(/already held by another process/);

			await holdLockPromise;
		});

		it('tryWithLock should succeed when lock is not held', async () => {
			if (!isPostgres) return;

			const result = await dbLockService.tryWithLock(DbLock.TEST, async () => 'free');
			expect(result).toBe('free');
		});
	});
});
