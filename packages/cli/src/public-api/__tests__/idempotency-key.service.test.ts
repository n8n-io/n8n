import type { IdempotencyKeyForClaim, IdempotencyKeyRepository } from '@n8n/db';
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

	describe('claim', () => {
		const input = {
			userId: 'user-1',
			idempotencyKey: 'abc',
			fingerprint: 'fingerprint-a',
		};

		const stored = (overrides: Partial<IdempotencyKeyForClaim> = {}): IdempotencyKeyForClaim => ({
			fingerprint: input.fingerprint,
			status: 'completed',
			responseStatus: 200,
			responseBody: { id: 'wf' },
			createdAt: new Date(),
			...overrides,
		});

		it('returns the new row when the insert wins', async () => {
			idempotencyKeyRepository.insertProcessing.mockResolvedValue('row-1');

			const claim = await service.claim(input);

			expect(claim).toEqual({ outcome: 'claimed', id: 'row-1' });
			expect(idempotencyKeyRepository.findByUserIdAndKey).not.toHaveBeenCalled();
		});

		it('replays a completed row with the same fingerprint', async () => {
			idempotencyKeyRepository.insertProcessing.mockResolvedValue(null);
			idempotencyKeyRepository.findByUserIdAndKey.mockResolvedValue(stored());

			const claim = await service.claim(input);

			expect(claim).toEqual({
				outcome: 'replay',
				responseStatus: 200,
				responseBody: { id: 'wf' },
			});
		});

		it('returns processing when the same fingerprint is still in flight', async () => {
			idempotencyKeyRepository.insertProcessing.mockResolvedValue(null);
			idempotencyKeyRepository.findByUserIdAndKey.mockResolvedValue(
				stored({ status: 'processing', responseStatus: null, responseBody: null }),
			);

			const claim = await service.claim(input);

			expect(claim).toEqual({ outcome: 'processing' });
		});

		it('returns mismatch before it replays a different request', async () => {
			idempotencyKeyRepository.insertProcessing.mockResolvedValue(null);
			idempotencyKeyRepository.findByUserIdAndKey.mockResolvedValue(
				stored({ fingerprint: 'fingerprint-b' }),
			);

			const claim = await service.claim(input);

			expect(claim).toEqual({ outcome: 'mismatch' });
		});

		it('returns mismatch when a different request is still in flight', async () => {
			idempotencyKeyRepository.insertProcessing.mockResolvedValue(null);
			idempotencyKeyRepository.findByUserIdAndKey.mockResolvedValue(
				stored({
					fingerprint: 'fingerprint-b',
					status: 'processing',
					responseStatus: null,
					responseBody: null,
				}),
			);

			const claim = await service.claim(input);

			expect(claim).toEqual({ outcome: 'mismatch' });
		});

		it('treats a row older than the TTL as a miss and claims again', async () => {
			idempotencyKeyRepository.insertProcessing
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce('row-2');
			idempotencyKeyRepository.findByUserIdAndKey.mockResolvedValue(
				stored({ createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) }),
			);
			idempotencyKeyRepository.deleteByUserIdAndKeyOlderThan.mockResolvedValue(1);

			const claim = await service.claim(input);

			expect(idempotencyKeyRepository.deleteByUserIdAndKeyOlderThan).toHaveBeenCalledTimes(1);
			expect(claim).toEqual({ outcome: 'claimed', id: 'row-2' });
		});
	});
});
