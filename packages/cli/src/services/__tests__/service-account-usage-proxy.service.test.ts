import { mock } from 'vitest-mock-extended';

import type { ServiceAccountUsage } from '../service-account-usage.contracts';
import { ServiceAccountUsageProxy } from '../service-account-usage-proxy.service';

describe('ServiceAccountUsageProxy', () => {
	it('finds no agent before the agents module registers', async () => {
		const proxy = new ServiceAccountUsageProxy();

		expect(proxy.isRegistered).toBe(false);
		await expect(proxy.findAgent('service-1')).resolves.toBeNull();
	});

	it('asks the registered usage', async () => {
		const usage = mock<ServiceAccountUsage>();
		usage.findAgent.mockResolvedValue({ id: 'agent-1', name: 'Support' });
		const proxy = new ServiceAccountUsageProxy();

		proxy.register(usage);

		expect(proxy.isRegistered).toBe(true);
		await expect(proxy.findAgent('service-1')).resolves.toEqual({
			id: 'agent-1',
			name: 'Support',
		});
		expect(usage.findAgent).toHaveBeenCalledWith('service-1');
	});
});
