import type { DatabaseConfig } from '@n8n/config';
import { QueryFailedError } from '@n8n/typeorm';
import type { DataSource, EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { OperationalError } from 'n8n-workflow';

import { DbLockService } from '../db-lock.service';

describe('DbLockService', () => {
	const mockTx = mock<EntityManager>();
	const dataSource = mock<DataSource>();
	const databaseConfig = mock<DatabaseConfig>();

	const transactionMock = jest.fn<Promise<unknown>, [(tx: EntityManager) => Promise<unknown>]>();

	let service: DbLockService;

	beforeEach(() => {
		jest.resetAllMocks();
		transactionMock.mockImplementation(async (fn) => await fn(mockTx));
		dataSource.manager.transaction = transactionMock as never;
		mockTx.query.mockResolvedValue([]);
		service = new DbLockService(dataSource, databaseConfig);
	});

	describe('withLock', () => {
		it('should acquire advisory lock and execute fn on Postgres', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');

			const result = await service.withLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1001]);
			expect(fn).toHaveBeenCalledWith(mockTx);
		});

		it('should skip advisory lock on SQLite and still execute fn', async () => {
			databaseConfig.type = 'sqlite';
			const fn = jest.fn().mockResolvedValue('result');

			const result = await service.withLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).not.toHaveBeenCalled();
			expect(fn).toHaveBeenCalledWith(mockTx);
		});

		it('should set lock_timeout when timeoutMs is provided', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');

			await service.withLock(1001, fn, { timeoutMs: 5000 });

			expect(mockTx.query).toHaveBeenCalledWith("SET LOCAL lock_timeout = '5000'");
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1001]);
		});

		it('should not set lock_timeout when timeoutMs is not provided', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');

			await service.withLock(1001, fn);

			expect(mockTx.query).not.toHaveBeenCalledWith(expect.stringContaining('lock_timeout'));
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [1001]);
		});

		it('should throw OperationalError when lock timeout is exceeded', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			const timeoutError = new QueryFailedError(
				'SELECT pg_advisory_xact_lock($1)',
				[1001],
				new Error('canceling statement due to lock timeout'),
			);

			// First call succeeds (SET LOCAL), second call throws (advisory lock)
			mockTx.query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(timeoutError);

			await expect(service.withLock(1001, fn, { timeoutMs: 5000 })).rejects.toThrow(
				OperationalError,
			);
			expect(fn).not.toHaveBeenCalled();
		});

		it('should include timeout details in OperationalError message', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			const timeoutError = new QueryFailedError(
				'SELECT pg_advisory_xact_lock($1)',
				[1001],
				new Error('canceling statement due to lock timeout'),
			);

			mockTx.query.mockResolvedValueOnce(undefined).mockRejectedValueOnce(timeoutError);

			await expect(service.withLock(1001, fn, { timeoutMs: 5000 })).rejects.toThrow(
				/Timed out waiting for DbLock 1001 after 5000ms/,
			);
		});

		it('should propagate non-timeout errors unchanged', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			const otherError = new Error('connection lost');

			mockTx.query.mockRejectedValueOnce(otherError);

			await expect(service.withLock(1001, fn)).rejects.toThrow('connection lost');
			expect(fn).not.toHaveBeenCalled();
		});
	});

	describe('tryWithLock', () => {
		it('should execute fn when lock is acquired', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn().mockResolvedValue('result');
			mockTx.query.mockResolvedValueOnce([{ pg_try_advisory_xact_lock: true }]);

			const result = await service.tryWithLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).toHaveBeenCalledWith('SELECT pg_try_advisory_xact_lock($1)', [1001]);
			expect(fn).toHaveBeenCalledWith(mockTx);
		});

		it('should throw OperationalError when lock is already held', async () => {
			databaseConfig.type = 'postgresdb';
			const fn = jest.fn();
			mockTx.query.mockResolvedValueOnce([{ pg_try_advisory_xact_lock: false }]);

			const error = await service.tryWithLock(1001, fn).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect((error as OperationalError).message).toMatch(
				/DbLock 1001 is already held by another process/,
			);
			expect(fn).not.toHaveBeenCalled();
		});

		it('should skip advisory lock on SQLite and execute fn', async () => {
			databaseConfig.type = 'sqlite';
			const fn = jest.fn().mockResolvedValue('result');

			const result = await service.tryWithLock(1001, fn);

			expect(result).toBe('result');
			expect(mockTx.query).not.toHaveBeenCalled();
			expect(fn).toHaveBeenCalledWith(mockTx);
		});
	});

	describe('SQLite in-process mutex', () => {
		beforeEach(() => {
			databaseConfig.type = 'sqlite';
		});

		afterEach(() => {
			jest.useRealTimers();
		});

		it('should serialize concurrent withLock calls for the same lockId', async () => {
			const executionOrder: string[] = [];
			let resolveFirst!: () => void;
			const firstBlocking = new Promise<void>((r) => {
				resolveFirst = r;
			});

			const fn1 = jest.fn(async () => {
				executionOrder.push('fn1-start');
				await firstBlocking;
				executionOrder.push('fn1-end');
				return 'first';
			});
			const fn2 = jest.fn(async () => {
				executionOrder.push('fn2-start');
				return 'second';
			});

			const p1 = service.withLock(1001, fn1);
			const p2 = service.withLock(1001, fn2);

			// fn1 has started but fn2 should not have
			await new Promise((r) => setImmediate(r));
			expect(fn1).toHaveBeenCalled();
			expect(fn2).not.toHaveBeenCalled();

			resolveFirst();
			const [r1, r2] = await Promise.all([p1, p2]);

			expect(r1).toBe('first');
			expect(r2).toBe('second');
			expect(executionOrder).toEqual(['fn1-start', 'fn1-end', 'fn2-start']);
		});

		it('should not block different lockIds', async () => {
			let resolveFirst!: () => void;
			const firstBlocking = new Promise<void>((r) => {
				resolveFirst = r;
			});

			const fn1 = jest.fn(async () => {
				await firstBlocking;
				return 'first';
			});
			const fn2 = jest.fn(async () => 'second');

			const p1 = service.withLock(1001, fn1);
			const p2 = service.withLock(9999, fn2);

			// Both should start since they use different lockIds
			await new Promise((r) => setImmediate(r));
			expect(fn1).toHaveBeenCalled();
			expect(fn2).toHaveBeenCalled();

			resolveFirst();
			const [r1, r2] = await Promise.all([p1, p2]);
			expect(r1).toBe('first');
			expect(r2).toBe('second');
		});

		it('should reject with OperationalError when withLock timeout expires', async () => {
			jest.useFakeTimers();

			let resolveFirst!: () => void;
			const firstBlocking = new Promise<void>((r) => {
				resolveFirst = r;
			});

			const fn1 = jest.fn(async () => {
				await firstBlocking;
				return 'first';
			});
			const fn2 = jest.fn().mockResolvedValue('second');

			const p1 = service.withLock(1001, fn1);
			const p2 = service.withLock(1001, fn2, { timeoutMs: 100 });

			jest.advanceTimersByTime(100);

			await expect(p2).rejects.toThrow(OperationalError);
			await expect(p2).rejects.toThrow(/Timed out waiting for DbLock 1001 after 100ms/);
			expect(fn2).not.toHaveBeenCalled();

			resolveFirst();
			await p1;
		});

		it('should fail tryWithLock immediately when lock is held', async () => {
			let resolveFirst!: () => void;
			const firstBlocking = new Promise<void>((r) => {
				resolveFirst = r;
			});

			const fn1 = jest.fn(async () => {
				await firstBlocking;
				return 'first';
			});
			const fn2 = jest.fn().mockResolvedValue('second');

			const p1 = service.withLock(1001, fn1);

			// Wait for fn1 to start (lock is held)
			await new Promise((r) => setImmediate(r));

			await expect(service.tryWithLock(1001, fn2)).rejects.toThrow(
				/DbLock 1001 is already held by another process/,
			);
			expect(fn2).not.toHaveBeenCalled();

			resolveFirst();
			await p1;
		});

		it('should release lock when fn throws in withLock', async () => {
			const fn1 = jest.fn().mockRejectedValue(new Error('fn1 failed'));
			const fn2 = jest.fn().mockResolvedValue('second');

			await expect(service.withLock(1001, fn1)).rejects.toThrow('fn1 failed');

			const result = await service.withLock(1001, fn2);
			expect(result).toBe('second');
		});

		it('should release lock when fn throws in tryWithLock', async () => {
			const fn1 = jest.fn().mockRejectedValue(new Error('fn1 failed'));
			const fn2 = jest.fn().mockResolvedValue('second');

			await expect(service.tryWithLock(1001, fn1)).rejects.toThrow('fn1 failed');

			const result = await service.tryWithLock(1001, fn2);
			expect(result).toBe('second');
		});

		it('should treat double-release as a safe no-op', async () => {
			let resolveFirst!: () => void;
			const firstBlocking = new Promise<void>((r) => {
				resolveFirst = r;
			});

			const fn1 = jest.fn(async () => {
				await firstBlocking;
				return 'first';
			});
			const fn2 = jest.fn().mockResolvedValue('second');
			const fn3 = jest.fn().mockResolvedValue('third');

			const p1 = service.withLock(1001, fn1);
			const p2 = service.withLock(1001, fn2);

			await new Promise((r) => setImmediate(r));

			// fn1 holds the lock, fn2 is queued
			resolveFirst();
			await Promise.all([p1, p2]);

			// The internal release for p1 already fired once (via finally).
			// If double-release corrupted state, fn3 would fail or deadlock.
			const result = await service.withLock(1001, fn3);
			expect(result).toBe('third');
		});

		it('should execute 3+ waiters in FIFO order', async () => {
			const executionOrder: string[] = [];
			let resolve1!: () => void;
			let resolve2!: () => void;
			const blocking1 = new Promise<void>((r) => {
				resolve1 = r;
			});
			const blocking2 = new Promise<void>((r) => {
				resolve2 = r;
			});

			const fn1 = jest.fn(async () => {
				executionOrder.push('fn1');
				await blocking1;
				return 'first';
			});
			const fn2 = jest.fn(async () => {
				executionOrder.push('fn2');
				await blocking2;
				return 'second';
			});
			const fn3 = jest.fn(async () => {
				executionOrder.push('fn3');
				return 'third';
			});

			const p1 = service.withLock(1001, fn1);
			const p2 = service.withLock(1001, fn2);
			const p3 = service.withLock(1001, fn3);

			await new Promise((r) => setImmediate(r));
			expect(executionOrder).toEqual(['fn1']);

			resolve1();
			await p1;
			await new Promise((r) => setImmediate(r));
			expect(executionOrder).toEqual(['fn1', 'fn2']);

			resolve2();
			const [r2, r3] = await Promise.all([p2, p3]);

			expect(r2).toBe('second');
			expect(r3).toBe('third');
			expect(executionOrder).toEqual(['fn1', 'fn2', 'fn3']);
		});
	});
});
