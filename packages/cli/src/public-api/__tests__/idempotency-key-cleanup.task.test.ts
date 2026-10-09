import type { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { idempotencyKeyTtlMs } from '@n8n/db';
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
	it('should declare an hourly leader-only cleanup', () => {
		expect(task.name).toBe('idempotency-key-cleanup');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: Time.hours.toSeconds });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: false, runOnTakeover: true });
	});

	describe('run', () => {
		it('should delete keys older than 12 hours', async () => {
			idempotencyKeyService.deleteOlderThan.mockResolvedValue(10);
			const startedAt = Date.now();

			await task.run(signal);

			expect(idempotencyKeyService.deleteOlderThan).toHaveBeenCalledTimes(1);
			const [cutoff] = idempotencyKeyService.deleteOlderThan.mock.calls[0];
			expect(startedAt - cutoff.getTime()).toBeGreaterThanOrEqual(idempotencyKeyTtlMs);
			expect(Date.now() - cutoff.getTime()).toBeLessThan(idempotencyKeyTtlMs + 1_000);
		});

		it('should log the total when keys are deleted', async () => {
			idempotencyKeyService.deleteOlderThan.mockResolvedValue(42);

			await task.run(signal);

			expect(logger.debug).toHaveBeenCalledWith('Cleaned up expired idempotency keys', {
				count: 42,
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
