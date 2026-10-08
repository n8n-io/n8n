import type { InstanceRegistration } from '@n8n/api-types';

import { summarizeFootprint } from '../cluster-footprint';

const reg = (
	instanceType: InstanceRegistration['instanceType'],
	cpuLimit?: number | null,
	memoryLimit?: number | null,
): InstanceRegistration => ({
	schemaVersion: 1,
	instanceKey: 'secret-key',
	hostId: 'secret-host',
	instanceType,
	instanceRole: 'unset',
	version: '1.0.0',
	registeredAt: 0,
	lastSeen: 0,
	cpuLimit,
	memoryLimit,
});

describe('summarizeFootprint', () => {
	it('sends nothing for an empty registry', () => {
		expect(summarizeFootprint([])).toEqual({});
	});

	it('counts by type and sums the limits', () => {
		const result = summarizeFootprint([
			reg('main', 2, 2048 * 1024),
			reg('worker', 1, 1024 * 1024),
			reg('worker', 1, 1024 * 1024),
			reg('webhook', 0.5, 512 * 1024),
		]);

		expect(result).toEqual({
			main_count: 1,
			worker_count: 2,
			webhook_count: 1,
			engine_count: 0,
			cluster_cpu_limit: 4.5,
			cluster_memory_limit: 4608,
			unlimited_process_count: 0,
		});
	});

	it('counts processes without a limit instead of summing them', () => {
		const result = summarizeFootprint([
			reg('worker', 2, 1024),
			reg('worker', null, null),
			reg('main'),
		]);

		expect(result).toMatchObject({ cluster_cpu_limit: 2, unlimited_process_count: 2 });
	});

	it('counts engine processes and rounds fractional CPUs', () => {
		const result = summarizeFootprint([reg('engine', 0.1, 1024), reg('main', 0.2, 1024)]);

		expect(result).toMatchObject({ engine_count: 1, cluster_cpu_limit: 0.3 });
	});

	it('never includes host names or keys', () => {
		expect(JSON.stringify(summarizeFootprint([reg('main', 1, 1024)]))).not.toContain('secret');
	});
});
