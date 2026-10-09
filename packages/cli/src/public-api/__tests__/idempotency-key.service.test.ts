import type { IdempotencyKeyRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { IdempotencyKeyService } from '@/public-api/idempotency-key.service';

const batchSize = 500;

describe('IdempotencyKeyService', () => {
	const idempotencyKeyRepository = mock<IdempotencyKeyRepository>();
	const service = new IdempotencyKeyService(idempotencyKeyRepository);
	const cutoff = new Date('2026-10-08T00:00:00.000Z');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('deleteOlderThan', () => {
		it('deletes one batch when fewer rows than the batch size are old enough', async () => {
			idempotencyKeyRepository.deleteOlderThan.mockResolvedValueOnce(10);

			const deleted = await service.deleteOlderThan(cutoff);

			expect(idempotencyKeyRepository.deleteOlderThan).toHaveBeenCalledTimes(1);
			expect(idempotencyKeyRepository.deleteOlderThan).toHaveBeenCalledWith(cutoff, batchSize);
			expect(deleted).toBe(10);
		});

		it('keeps deleting while a statement removes a full batch', async () => {
			idempotencyKeyRepository.deleteOlderThan
				.mockResolvedValueOnce(batchSize)
				.mockResolvedValueOnce(batchSize)
				.mockResolvedValueOnce(3);

			const deleted = await service.deleteOlderThan(cutoff);

			expect(idempotencyKeyRepository.deleteOlderThan).toHaveBeenCalledTimes(3);
			expect(deleted).toBe(batchSize * 2 + 3);
		});

		it('returns 0 when nothing is old enough', async () => {
			idempotencyKeyRepository.deleteOlderThan.mockResolvedValueOnce(0);

			const deleted = await service.deleteOlderThan(cutoff);

			expect(deleted).toBe(0);
		});
	});
});
