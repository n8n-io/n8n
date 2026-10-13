import type { InstanceRegistration } from '@n8n/api-types';

import { summarizeFootprint } from '../cluster-footprint';

const reg = (
	instanceType: InstanceRegistration['instanceType'],
	cpuLimit?: number | null,
	memoryLimit?: number | null,
	version = '2.4.0',
): InstanceRegistration => ({
	schemaVersion: 1,
	instanceKey: 'secret-key',
	hostId: 'secret-host',
	instanceType,
	instanceRole: 'unset',
	version,
	registeredAt: 0,
	lastSeen: 0,
	cpuLimit,
	memoryLimit,
});

describe('summarizeFootprint', () => {
	it('sends nothing for an empty registry', () => {
		expect(summarizeFootprint([])).toEqual({});
	});

	it('groups processes by type, limits and version', () => {
		const result = summarizeFootprint([
			reg('main', 1, 2048 * 1024 * 1024),
			reg('worker', null, 2048 * 1024 * 1024),
			reg('worker', null, 2048 * 1024 * 1024),
			reg('worker', 2, 2048 * 1024 * 1024),
			reg('webhook', 0.5, 512 * 1024 * 1024, '2.3.0'),
		]);

		expect(result.processes).toEqual([
			{ type: 'main', cpu: 1, memory_kib: 2097152, version: '2.4.0', count: 1 },
			{ type: 'worker', cpu: null, memory_kib: 2097152, version: '2.4.0', count: 2 },
			{ type: 'worker', cpu: 2, memory_kib: 2097152, version: '2.4.0', count: 1 },
			{ type: 'webhook', cpu: 0.5, memory_kib: 524288, version: '2.3.0', count: 1 },
		]);
	});

	it('reports a missing CPU or memory limit on its own', () => {
		const result = summarizeFootprint([reg('worker', 1, null), reg('worker', null, 1024)]);

		expect(result.processes).toEqual([
			{ type: 'worker', cpu: 1, memory_kib: null, version: '2.4.0', count: 1 },
			{ type: 'worker', cpu: null, memory_kib: 1, version: '2.4.0', count: 1 },
		]);
	});

	it('treats a registration from an older version as having no limits', () => {
		const result = summarizeFootprint([reg('main', undefined, undefined, '2.3.0')]);

		expect(result.processes).toEqual([
			{ type: 'main', cpu: null, memory_kib: null, version: '2.3.0', count: 1 },
		]);
	});

	it('never includes host names or keys', () => {
		expect(JSON.stringify(summarizeFootprint([reg('main', 1, 1024)]))).not.toContain('secret');
	});
});
