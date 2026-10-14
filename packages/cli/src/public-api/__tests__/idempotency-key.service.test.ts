import type { IdempotencyKeyRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { CLEANUP_BATCH_SIZE, IdempotencyKeyService } from '@/public-api/idempotency-key.service';

describe('IdempotencyKeyService', () => {
	const idempotencyKeyRepository = mock<IdempotencyKeyRepository>();
	const service = new IdempotencyKeyService(idempotencyKeyRepository);
	const cutoff = new Date('2026-10-08T00:00:00.000Z');
	let signal: AbortSignal;

	beforeEach(() => {
		vi.clearAllMocks();
		signal = new AbortController().signal;
	});

	describe('deleteOlderThan', () => {
		it('deletes one batch when fewer rows than the batch size are old enough', async () => {
			idempotencyKeyRepository.deleteOlderThan.mockResolvedValueOnce(10);

			const deleted = await service.deleteOlderThan(cutoff, signal);

			expect(idempotencyKeyRepository.deleteOlderThan).toHaveBeenCalledTimes(1);
			expect(idempotencyKeyRepository.deleteOlderThan).toHaveBeenCalledWith(
				cutoff,
				CLEANUP_BATCH_SIZE,
			);
			expect(deleted).toBe(10);
		});

		it('keeps deleting while a statement removes a full batch', async () => {
			idempotencyKeyRepository.deleteOlderThan
				.mockResolvedValueOnce(CLEANUP_BATCH_SIZE)
				.mockResolvedValueOnce(CLEANUP_BATCH_SIZE)
				.mockResolvedValueOnce(3);

			const deleted = await service.deleteOlderThan(cutoff, signal);

			expect(idempotencyKeyRepository.deleteOlderThan).toHaveBeenCalledTimes(3);
			expect(deleted).toBe(CLEANUP_BATCH_SIZE * 2 + 3);
		});
	});
});
