import type { Logger } from '@n8n/backend-common';
import { IDEMPOTENCY_KEY_TTL_MS } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { IdempotencyKeyCleanupTask } from '@/public-api/idempotency-key-cleanup.task';
import type { IdempotencyKeyService } from '@/public-api/idempotency-key.service';

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const idempotencyKeyService = mock<IdempotencyKeyService>();

let task: IdempotencyKeyCleanupTask;
let signal: AbortSignal;

beforeEach(() => {
	vi.clearAllMocks();
	task = new IdempotencyKeyCleanupTask(logger, idempotencyKeyService);
	signal = new AbortController().signal;
});

describe('IdempotencyKeyCleanupTask', () => {
	describe('run', () => {
		it('should delete keys older than 12 hours and log the total', async () => {
			idempotencyKeyService.deleteOlderThan.mockResolvedValue(10);

			await task.run(signal);

			expect(idempotencyKeyService.deleteOlderThan).toHaveBeenCalledTimes(1);
			const [cutoff, passedSignal] = idempotencyKeyService.deleteOlderThan.mock.calls[0];
			expect(passedSignal).toBe(signal);
			const ageMs = Date.now() - cutoff.getTime();
			expect(ageMs).toBeGreaterThanOrEqual(IDEMPOTENCY_KEY_TTL_MS);
			expect(ageMs).toBeLessThan(IDEMPOTENCY_KEY_TTL_MS + 1_000);
			expect(logger.debug).toHaveBeenCalledWith('Cleaned up expired idempotency keys', {
				count: 10,
			});
		});

		it('should stay quiet when nothing is old enough', async () => {
			idempotencyKeyService.deleteOlderThan.mockResolvedValue(0);

			await task.run(signal);

			expect(logger.debug).not.toHaveBeenCalled();
		});

		it('should reject when the delete fails so the runner reports it', async () => {
			idempotencyKeyService.deleteOlderThan.mockRejectedValue(new Error('DB error'));

			await expect(task.run(signal)).rejects.toThrow('DB error');
		});
	});
});
