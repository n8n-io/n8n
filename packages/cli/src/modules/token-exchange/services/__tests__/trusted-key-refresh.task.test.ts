import { mock } from 'vitest-mock-extended';

import { TrustedKeyRefreshTask } from '../trusted-key-refresh.task';
import type { TrustedKeyService } from '../trusted-key.service';

describe('TrustedKeyRefreshTask', () => {
	const trustedKeyService = mock<TrustedKeyService>();
	const task = new TrustedKeyRefreshTask(trustedKeyService);

	it('should declare a 30-second poll cadence', () => {
		expect(task.name).toBe('trusted-key-refresh');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should refresh the due sources on run', async () => {
		await task.run();

		expect(trustedKeyService.refreshDueSources).toHaveBeenCalledTimes(1);
	});
});
