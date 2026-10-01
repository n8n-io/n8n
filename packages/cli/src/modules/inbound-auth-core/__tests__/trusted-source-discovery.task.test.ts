import { mock } from 'vitest-mock-extended';

import { TrustedSourceDiscoveryTask } from '../trusted-source-discovery.task';
import type { TrustedSourceDiscoveryService } from '../trusted-source-discovery.service';

describe('TrustedSourceDiscoveryTask', () => {
	const discovery = mock<TrustedSourceDiscoveryService>();
	const task = new TrustedSourceDiscoveryTask(discovery);

	it('declares a durable, idempotent, cluster-wide 60-second poll', () => {
		expect(task.name).toBe('trusted-source-discovery');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 60 });
		expect(task.effects).toBe('idempotent');
		expect(task.placement).toEqual({ scope: 'cluster', durable: true });
	});

	it('refreshes the due sources with the run signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(discovery.refreshDue).toHaveBeenCalledTimes(1);
		expect(discovery.refreshDue).toHaveBeenCalledWith(signal);
	});
});
