import { describe, it, expect, beforeEach } from 'vitest';
import { createQueue, isWriteOperation } from './queue';

describe('isWriteOperation', () => {
	it('should return true for INSERT statements', () => {
		expect(isWriteOperation('INSERT INTO users VALUES (1, "test")')).toBe(true);
		expect(isWriteOperation('  INSERT INTO users VALUES (1, "test")')).toBe(true);
		expect(isWriteOperation('insert into users values (1, "test")')).toBe(true);
	});

	it('should return true for UPDATE statements', () => {
		expect(isWriteOperation('UPDATE users SET name = "test"')).toBe(true);
		expect(isWriteOperation('update users set name = "test"')).toBe(true);
	});

	it('should return true for DELETE statements', () => {
		expect(isWriteOperation('DELETE FROM users WHERE id = 1')).toBe(true);
		expect(isWriteOperation('delete from users where id = 1')).toBe(true);
	});

	it('should return true for CREATE statements', () => {
		expect(isWriteOperation('CREATE TABLE users (id INT)')).toBe(true);
		expect(isWriteOperation('CREATE INDEX idx ON users(id)')).toBe(true);
	});

	it('should return true for DROP statements', () => {
		expect(isWriteOperation('DROP TABLE users')).toBe(true);
		expect(isWriteOperation('DROP INDEX idx')).toBe(true);
	});

	it('should return true for ALTER statements', () => {
		expect(isWriteOperation('ALTER TABLE users ADD COLUMN age INT')).toBe(true);
	});

	it('should return true for REPLACE statements', () => {
		expect(isWriteOperation('REPLACE INTO users VALUES (1, "test")')).toBe(true);
	});

	it('should return true for VACUUM statements', () => {
		expect(isWriteOperation('VACUUM')).toBe(true);
		expect(isWriteOperation('vacuum')).toBe(true);
	});

	it('should return true for REINDEX statements', () => {
		expect(isWriteOperation('REINDEX')).toBe(true);
		expect(isWriteOperation('REINDEX users')).toBe(true);
	});

	it('should return true for ANALYZE statements', () => {
		expect(isWriteOperation('ANALYZE')).toBe(true);
		expect(isWriteOperation('ANALYZE users')).toBe(true);
	});

	it('should return true for transaction control statements', () => {
		expect(isWriteOperation('BEGIN')).toBe(true);
		expect(isWriteOperation('BEGIN TRANSACTION')).toBe(true);
		expect(isWriteOperation('COMMIT')).toBe(true);
		expect(isWriteOperation('ROLLBACK')).toBe(true);
		expect(isWriteOperation('SAVEPOINT my_savepoint')).toBe(true);
		expect(isWriteOperation('RELEASE my_savepoint')).toBe(true);
	});

	it('should return false for SELECT statements', () => {
		expect(isWriteOperation('SELECT * FROM users')).toBe(false);
		expect(isWriteOperation('  SELECT * FROM users')).toBe(false);
		expect(isWriteOperation('select * from users')).toBe(false);
	});

	it('should return false for WITH (CTE) SELECT statements', () => {
		expect(isWriteOperation('WITH cte AS (SELECT 1) SELECT * FROM cte')).toBe(false);
	});

	it('should return false for read-only PRAGMA statements', () => {
		expect(isWriteOperation('PRAGMA table_info(users)')).toBe(false);
		expect(isWriteOperation('PRAGMA user_version')).toBe(false);
		expect(isWriteOperation('PRAGMA journal_mode')).toBe(false);
	});

	it('should return true for write PRAGMA statements (with =)', () => {
		expect(isWriteOperation('PRAGMA user_version = 1')).toBe(true);
		expect(isWriteOperation('PRAGMA journal_mode = WAL')).toBe(true);
		expect(isWriteOperation('PRAGMA synchronous = OFF')).toBe(true);
		expect(isWriteOperation('pragma cache_size = 10000')).toBe(true);
	});

	it('should return false for EXPLAIN statements', () => {
		expect(isWriteOperation('EXPLAIN SELECT * FROM users')).toBe(false);
	});
});

describe('Queue', () => {
	let queue: ReturnType<typeof createQueue>;

	beforeEach(() => {
		queue = createQueue();
	});

	describe('enqueue', () => {
		it('should execute a single operation and return its result', async () => {
			const result = await queue.enqueue(async () => 'test result');
			expect(result).toBe('test result');
		});

		it('should execute write operations in order', async () => {
			const executionOrder: number[] = [];

			const promise1 = queue.enqueue(async () => {
				await new Promise((r) => setTimeout(r, 50));
				executionOrder.push(1);
				return 1;
			});

			const promise2 = queue.enqueue(async () => {
				executionOrder.push(2);
				return 2;
			});

			const promise3 = queue.enqueue(async () => {
				executionOrder.push(3);
				return 3;
			});

			const results = await Promise.all([promise1, promise2, promise3]);

			expect(executionOrder).toEqual([1, 2, 3]);
			expect(results).toEqual([1, 2, 3]);
		});

		it('should handle errors without blocking subsequent operations', async () => {
			const promise1 = queue.enqueue(async () => {
				throw new Error('Operation 1 failed');
			});

			const promise2 = queue.enqueue(async () => 'success');

			await expect(promise1).rejects.toThrow('Operation 1 failed');
			await expect(promise2).resolves.toBe('success');
		});

		it('should properly type the return value', async () => {
			const numberResult = await queue.enqueue(async () => 42);
			const stringResult = await queue.enqueue(async () => 'hello');
			const objectResult = await queue.enqueue(async () => ({ foo: 'bar' }));

			expect(numberResult).toBe(42);
			expect(stringResult).toBe('hello');
			expect(objectResult).toEqual({ foo: 'bar' });
		});

		it('should prevent concurrent execution for write operations', async () => {
			let concurrentOperations = 0;
			let maxConcurrent = 0;

			const operations = Array.from(
				{ length: 5 },
				async (_, i) =>
					await queue.enqueue(async () => {
						concurrentOperations++;
						maxConcurrent = Math.max(maxConcurrent, concurrentOperations);
						await new Promise((r) => setTimeout(r, 10));
						concurrentOperations--;
						return i;
					}),
			);

			await Promise.all(operations);
			expect(maxConcurrent).toBe(1);
		});

		it('should queue INSERT operations', async () => {
			const executionOrder: number[] = [];

			const promise1 = queue.enqueue(
				async () => {
					await new Promise((r) => setTimeout(r, 30));
					executionOrder.push(1);
					return 1;
				},
				{ sql: 'INSERT INTO users VALUES (1)' },
			);

			const promise2 = queue.enqueue(
				async () => {
					executionOrder.push(2);
					return 2;
				},
				{ sql: 'INSERT INTO users VALUES (2)' },
			);

			await Promise.all([promise1, promise2]);
			expect(executionOrder).toEqual([1, 2]);
		});

		it('should execute SELECT operations immediately without queueing', async () => {
			const executionOrder: number[] = [];

			// Start a slow write operation
			const writePromise = queue.enqueue(
				async () => {
					await new Promise((r) => setTimeout(r, 50));
					executionOrder.push(1);
					return 1;
				},
				{ sql: 'INSERT INTO users VALUES (1)' },
			);

			// SELECT should execute immediately, not wait for the write
			const selectPromise = queue.enqueue(
				async () => {
					executionOrder.push(2);
					return 2;
				},
				{ sql: 'SELECT * FROM users' },
			);

			await selectPromise;
			expect(executionOrder).toEqual([2]); // SELECT executed before INSERT finished

			await writePromise;
			expect(executionOrder).toEqual([2, 1]);
		});

		it('should allow concurrent SELECT operations', async () => {
			let concurrentOperations = 0;
			let maxConcurrent = 0;

			const operations = Array.from(
				{ length: 5 },
				async (_, i) =>
					await queue.enqueue(
						async () => {
							concurrentOperations++;
							maxConcurrent = Math.max(maxConcurrent, concurrentOperations);
							await new Promise((r) => setTimeout(r, 10));
							concurrentOperations--;
							return i;
						},
						{ sql: 'SELECT * FROM users' },
					),
			);

			await Promise.all(operations);
			expect(maxConcurrent).toBe(5); // All SELECT operations ran concurrently
		});
	});

	describe('getQueueLength', () => {
		it('should return 0 for empty queue', () => {
			expect(queue.getQueueLength()).toBe(0);
		});

		it('should return correct length when operations are queued', async () => {
			let resolveFirst!: () => void;
			const firstOperation = new Promise<void>((r) => {
				resolveFirst = r;
			});

			const enqueued = queue.enqueue(async () => await firstOperation);
			void queue.enqueue(async () => 'second');
			void queue.enqueue(async () => 'third');

			// First operation is processing, 2 are queued
			expect(queue.getQueueLength()).toBe(2);

			resolveFirst();
			await enqueued;
		});
	});

	describe('isProcessing', () => {
		it('should return false when idle', () => {
			expect(queue.isProcessing()).toBe(false);
		});

		it('should return true when processing', async () => {
			let resolveOperation!: () => void;
			const operation = new Promise<void>((r) => {
				resolveOperation = r;
			});

			const enqueued = queue.enqueue(async () => await operation);

			expect(queue.isProcessing()).toBe(true);

			resolveOperation();
			await enqueued;

			expect(queue.isProcessing()).toBe(false);
		});
	});
});
