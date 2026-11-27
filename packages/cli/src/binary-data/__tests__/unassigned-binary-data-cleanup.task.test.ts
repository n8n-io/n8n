import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { UnassignedBinaryDataCleanupService } from '../unassigned-binary-data-cleanup.service';
import { UnassignedBinaryDataCleanupTask } from '../unassigned-binary-data-cleanup.task';

describe('UnassignedBinaryDataCleanupTask', () => {
	const logger = mock<Logger>();
	const cleanupService = mock<UnassignedBinaryDataCleanupService>();
	const task = new UnassignedBinaryDataCleanupTask(logger, cleanupService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should run once for the cluster, every hour, with retries', () => {
		expect(task.target).toEqual({ scope: 'cluster', scheduler: { retryOnFailure: true } });
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 3600 });
	});

	it('should log how many files it deleted', async () => {
		const { signal } = new AbortController();
		cleanupService.deleteStaleFiles.mockResolvedValue(3);

		await task.run(signal);

		expect(cleanupService.deleteStaleFiles).toHaveBeenCalledWith(signal);
		expect(logger.info).toHaveBeenCalledWith(expect.any(String), { count: 3 });
	});

	it('should log nothing when it deleted no file', async () => {
		cleanupService.deleteStaleFiles.mockResolvedValue(0);

		await task.run(new AbortController().signal);

		expect(logger.info).not.toHaveBeenCalled();
	});
});
