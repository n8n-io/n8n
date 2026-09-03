import type { Logger } from '@n8n/backend-common';
import type { ActivityLogConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { ActivityEventRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';

describe('ActivityPruningTask', () => {
	const activityEventRepository = mock<ActivityEventRepository>();
	const scopedLogger = mock<Logger>();
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const taskWith = (config: Partial<ActivityLogConfig> = {}) =>
		new ActivityPruningTask(
			logger,
			activityEventRepository,
			mock<ActivityLogConfig>({ enabled: true, retentionDays: 14, maxEntries: 20_000, ...config }),
		);

	beforeEach(() => {
		vi.clearAllMocks();
		activityEventRepository.deleteOlderThan.mockResolvedValue(0);
		activityEventRepository.deleteBeyondNewest.mockResolvedValue(0);
	});

	it('applies the age cap and the count backstop, and reports what went', async () => {
		activityEventRepository.deleteOlderThan.mockResolvedValue(3);
		activityEventRepository.deleteBeyondNewest.mockResolvedValue(2);

		await taskWith().run(new AbortController().signal);

		const [cutoff] = activityEventRepository.deleteOlderThan.mock.calls[0];
		expect(Date.now() - cutoff.getTime()).toBeCloseTo(14 * Time.days.toMilliseconds, -3);
		expect(activityEventRepository.deleteBeyondNewest).toHaveBeenCalledWith(
			20_000,
			expect.any(AbortSignal),
		);
		expect(scopedLogger.debug).toHaveBeenCalledWith('Pruned 5 activity entries');
	});

	it('keeps draining the backlog after the flag is turned off', async () => {
		await taskWith({ enabled: false }).run(new AbortController().signal);

		expect(activityEventRepository.deleteOlderThan).toHaveBeenCalled();
		expect(activityEventRepository.deleteBeyondNewest).toHaveBeenCalled();
	});

	it.each([
		['age', { retentionDays: 0 }, 'deleteOlderThan'],
		['count', { maxEntries: 0 }, 'deleteBeyondNewest'],
	] as const)(
		'treats a %s cap of zero as opt-out rather than "keep nothing"',
		async (_name, config, method) => {
			await taskWith(config).run(new AbortController().signal);

			expect(activityEventRepository[method]).not.toHaveBeenCalled();
		},
	);

	it('stops at the boundary between sweeps once the run is told to abort', async () => {
		const controller = new AbortController();
		activityEventRepository.deleteOlderThan.mockImplementation(async () => {
			controller.abort();
			return 1;
		});

		await taskWith().run(controller.signal);

		expect(activityEventRepository.deleteBeyondNewest).not.toHaveBeenCalled();
	});

	/** Without this the sweep walks the whole backlog, and shutdown and stepdown wait on it. */
	it('hands the signal to each sweep so a long backlog can be interrupted mid-walk', async () => {
		const { signal } = new AbortController();

		await taskWith().run(signal);

		expect(activityEventRepository.deleteOlderThan).toHaveBeenCalledWith(expect.any(Date), signal);
		expect(activityEventRepository.deleteBeyondNewest).toHaveBeenCalledWith(20_000, signal);
	});

	/** The runner owns retries, so a failure has to surface rather than be swallowed here. */
	it('lets a failed sweep reach the runner', async () => {
		activityEventRepository.deleteOlderThan.mockRejectedValue(new Error('db is gone'));

		await expect(taskWith().run(new AbortController().signal)).rejects.toThrow('db is gone');
	});
});
