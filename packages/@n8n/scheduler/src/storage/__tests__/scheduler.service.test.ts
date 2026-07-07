import type { Logger } from '@n8n/backend-common';
import type { SchedulerConfig } from '@n8n/config';
import type { ScheduledTaskRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ScheduledTaskStatus } from '../../core/enums';
import { DEFAULT_RETENTION_OPTIONS } from '../../core/retention';
import type { MaterializerStore } from '../materializer-store';
import { SchedulerService } from '../scheduler.service';

/** Build the service with non-default retention config, returning its mocks. */
function makeService(configOverrides: Partial<SchedulerConfig> = {}) {
	const tasks = mock<ScheduledTaskRepository>();
	const logger = mock<Logger>();
	const config = mock<SchedulerConfig>({
		materializationWindowSeconds: 3600,
		retentionSeconds: 43_200,
		failedRetentionSeconds: 86_400,
		...configOverrides,
	});
	const service = new SchedulerService(mock<MaterializerStore>(), tasks, logger, config);
	return { service, tasks, logger };
}

describe('SchedulerService.prune', () => {
	it('maps the configured windows into the batches the repository receives', async () => {
		const { service, tasks } = makeService();
		tasks.deleteFinishedOlderThan.mockResolvedValue(0);

		const summary = await service.prune();

		expect(summary).toEqual({ deleted: 0, drained: true });
		expect(tasks.deleteFinishedOlderThan).toHaveBeenNthCalledWith(1, {
			statuses: [ScheduledTaskStatus.Succeeded, ScheduledTaskStatus.Cancelled],
			olderThanMs: 43_200_000,
			limit: DEFAULT_RETENTION_OPTIONS.batchSize,
		});
		expect(tasks.deleteFinishedOlderThan).toHaveBeenNthCalledWith(2, {
			statuses: [ScheduledTaskStatus.Failed, ScheduledTaskStatus.Missed],
			olderThanMs: 86_400_000,
			limit: DEFAULT_RETENTION_OPTIONS.batchSize,
		});
	});

	it('warns when a pass spends its batch budget with backlog remaining', async () => {
		const { service, tasks, logger } = makeService();
		// Every batch full: the pass can never prove either window drained.
		tasks.deleteFinishedOlderThan.mockResolvedValue(DEFAULT_RETENTION_OPTIONS.batchSize);

		const summary = await service.prune();

		expect(summary.drained).toBe(false);
		expect(logger.warn).toHaveBeenCalledWith(
			'Scheduler retention pass hit its batch budget; backlog remains',
			{ ...summary },
		);
		expect(logger.debug).not.toHaveBeenCalled();
	});

	it('logs a drained pass that deleted rows at debug only', async () => {
		const { service, tasks, logger } = makeService();
		tasks.deleteFinishedOlderThan.mockResolvedValueOnce(5).mockResolvedValue(0);

		const summary = await service.prune();

		expect(summary).toEqual({ deleted: 5, drained: true });
		expect(logger.debug).toHaveBeenCalledWith('Scheduler retention deleted finished tasks', {
			...summary,
		});
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('logs nothing on a no-op pass', async () => {
		const { service, tasks, logger } = makeService();
		tasks.deleteFinishedOlderThan.mockResolvedValue(0);

		await service.prune();

		expect(logger.debug).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
	});
});

describe('SchedulerService retention config', () => {
	it('warns at construction when failed runs are kept shorter than clean ones', () => {
		const { logger } = makeService({ retentionSeconds: 86_400, failedRetentionSeconds: 3600 });

		expect(logger.warn).toHaveBeenCalledWith(
			'Scheduler retention keeps failed runs shorter than succeeded ones; failure evidence will be deleted first',
			{ retentionSeconds: 86_400, failedRetentionSeconds: 3600 },
		);
	});

	it('stays silent when failed runs are kept at least as long', () => {
		const { logger } = makeService();

		expect(logger.warn).not.toHaveBeenCalled();
	});
});
