import type { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { Time } from '@n8n/constants';
import { IDEMPOTENCY_KEY_TTL_MS, IdempotencyKeyRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { IdempotencyKeyCleanupTask } from '@/public-api/idempotency-key-cleanup.task';
import { IdempotencyKeyService } from '@/public-api/idempotency-key.service';

import { createUser } from '../shared/db/users';

describe('IdempotencyKey cleanup', () => {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const signal = new AbortController().signal;
	let repository: IdempotencyKeyRepository;
	let task: IdempotencyKeyCleanupTask;
	let user: User;

	beforeAll(async () => {
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
	});
});
