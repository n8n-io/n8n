import { mock } from 'vitest-mock-extended';

import type { UnassignedBinaryDataBackfillService } from '../unassigned-binary-data-backfill.service';
import { UnassignedBinaryDataBackfillTask } from '../unassigned-binary-data-backfill.task';

describe('UnassignedBinaryDataBackfillTask', () => {
	const backfillService = mock<UnassignedBinaryDataBackfillService>();
	const task = new UnassignedBinaryDataBackfillTask(backfillService);

	it('should run once for the cluster, every minute, with retries', () => {
		expect(task.target).toEqual({ scope: 'cluster', scheduler: { retryOnFailure: true } });
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 60 });
	});

	it('should end a run before the next occurrence', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(backfillService.backfill).toHaveBeenCalledWith(signal, 45_000);
	});
});
