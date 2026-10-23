import type { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { IDEMPOTENCY_KEY_TTL_MS, IdempotencyKeyRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { IdempotencyKeyCleanupTask } from '@/public-api/idempotency-key-cleanup.task';
import { CLEANUP_BATCH_SIZE, IdempotencyKeyService } from '@/public-api/idempotency-key.service';

import { createUser } from '../shared/db/users';

const OVERLAPPING_RUNS = 4;
const EXPIRED_KEYS = 3 * CLEANUP_BATCH_SIZE;
const FRESH_KEYS = 200;

describe('IdempotencyKey cleanup', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const signal = new AbortController().signal;
	let repository: IdempotencyKeyRepository;
	let task: IdempotencyKeyCleanupTask;
	let user: User;

	beforeAll(async () => {
		// One connection per run, so the runs delete at the same time.
		Container.get(GlobalConfig).database.postgresdb.poolSize = OVERLAPPING_RUNS;
		await testDb.init();
		repository = Container.get(IdempotencyKeyRepository);
		task = new IdempotencyKeyCleanupTask(logger, new IdempotencyKeyService(repository));
		user = await createUser();
	});

	beforeEach(() => {
		logger.debug.mockClear();
	});

	afterEach(async () => {
		await testDb.truncate(['IdempotencyKey']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertKey(idempotencyKey: string, createdAt: Date) {
		const row = repository.create({
			userId: user.id,
			idempotencyKey,
			fingerprint: 'fp',
			status: 'processing',
		});
		const saved = await repository.save(row);
		await repository.update(saved.id, { createdAt });
		return saved;
	}

	/** Returns the keys that a sweep must keep. */
	async function seedExpiredAndFresh(): Promise<string[]> {
		const now = Date.now();
		const seed = async (prefix: string, count: number, createdAt: Date) => {
			const keys = Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
			for (let start = 0; start < count; start += CLEANUP_BATCH_SIZE) {
				await repository.insert(
					keys.slice(start, start + CLEANUP_BATCH_SIZE).map((idempotencyKey) => ({
						id: idempotencyKey,
						userId: user.id,
						idempotencyKey,
						fingerprint: 'fp',
						status: 'processing' as const,
						createdAt,
					})),
				);
			}
			return keys;
		};

		await seed(
			'expired',
			EXPIRED_KEYS,
			new Date(now - IDEMPOTENCY_KEY_TTL_MS - Time.hours.toMilliseconds),
		);
		const fresh = await seed('fresh', FRESH_KEYS, new Date(now));
		return fresh.sort();
	}

	async function remainingKeys(): Promise<string[]> {
		const rows = await repository.find({ select: { idempotencyKey: true } });
		return rows.map(({ idempotencyKey }) => idempotencyKey).sort();
	}

	function deletedTotal(): number {
		return logger.debug.mock.calls
			.filter(([message]) => message === 'Cleaned up expired idempotency keys')
			.reduce((sum, [, meta]) => sum + Number((meta as { count: number }).count), 0);
	}

	describe('deleteOlderThan', () => {
		it('should delete keys older than the cutoff and keep the rest', async () => {
			const cutoff = new Date('2026-10-08T12:00:00.000Z');

			const old = await insertKey('old', new Date(cutoff.getTime() - 1_000));
			const boundary = await insertKey('boundary', cutoff);
			const fresh = await insertKey('fresh', new Date(cutoff.getTime() + 1_000));

			const deleted = await repository.deleteOlderThan(cutoff, 10);
			expect(deleted).toBe(1);

			const remaining = await repository.find({ order: { createdAt: 'ASC' } });
			expect(remaining).toHaveLength(2);
			expect(remaining).not.toContainEqual(expect.objectContaining({ id: old.id }));
			expect(remaining).toContainEqual(expect.objectContaining({ id: boundary.id }));
			expect(remaining).toContainEqual(expect.objectContaining({ id: fresh.id }));
		});

		it('should delete at most the limit', async () => {
			const cutoff = new Date('2026-10-08T12:00:00.000Z');
			const createdAt = new Date(cutoff.getTime() - Time.hours.toMilliseconds);
			await insertKey('old-1', createdAt);
			await insertKey('old-2', createdAt);
			await insertKey('old-3', createdAt);

			const deleted = await repository.deleteOlderThan(cutoff, 2);
			const remaining = await repository.count();

			expect(deleted).toBe(2);
			expect(remaining).toBe(1);
		});

		it('should return 0 when nothing is old enough', async () => {
			const cutoff = new Date('2026-10-08T12:00:00.000Z');
			await insertKey('fresh', new Date(cutoff.getTime() + 1_000));

			const deleted = await repository.deleteOlderThan(cutoff, 10);
			const remaining = await repository.count();

			expect(deleted).toBe(0);
			expect(remaining).toBe(1);
		});
	});

	describe('markCompleted', () => {
		it('completes a processing row', async () => {
			const id = await repository.insertProcessing({
				userId: user.id,
				idempotencyKey: 'complete-me',
				fingerprint: 'fp',
			});
			if (!id) throw new Error('insert did not return an id');

			await repository.markCompleted(id, 201, { ok: true });

			const row = await repository.findOneBy({ id });
			expect(row).toMatchObject({
				status: 'completed',
				responseStatus: 201,
				responseBody: { ok: true },
			});
		});

		it('does not recreate a processing row that was already deleted', async () => {
			const id = await repository.insertProcessing({
				userId: user.id,
				idempotencyKey: 'already-gone',
				fingerprint: 'fp',
			});
			if (!id) throw new Error('insert did not return an id');

			await repository.delete({ id });
			await repository.markCompleted(id, 201, { ok: true });

			expect(await repository.count()).toBe(0);
		});
	});

	describe('IdempotencyKeyCleanupTask', () => {
		it('should delete keys older than 12 hours and keep newer keys', async () => {
			const now = Date.now();
			await insertKey(
				'expired',
				new Date(now - IDEMPOTENCY_KEY_TTL_MS - Time.minutes.toMilliseconds),
			);
			await insertKey('kept', new Date(now - IDEMPOTENCY_KEY_TTL_MS + Time.hours.toMilliseconds));

			await task.run(signal);

			const remaining = await repository.find();
			expect(remaining.map((row) => row.idempotencyKey)).toEqual(['kept']);
			expect(logger.debug).toHaveBeenCalledWith('Cleaned up expired idempotency keys', {
				count: 1,
			});
		});

		it('should delete each expired key once when runs overlap', async () => {
			const kept = await seedExpiredAndFresh();

			await Promise.all(
				Array.from({ length: OVERLAPPING_RUNS }, async () => await task.run(signal)),
			);

			expect(await remainingKeys()).toEqual(kept);
			expect(deletedTotal()).toBe(EXPIRED_KEYS);
		});
	});
});
