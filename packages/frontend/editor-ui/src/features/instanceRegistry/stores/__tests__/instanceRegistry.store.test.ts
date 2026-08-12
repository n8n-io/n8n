import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { ClusterInfo, ClusterInfoResponse } from '@n8n/api-types';
import { useInstanceRegistryStore } from '../instanceRegistry.store';

const mocks = vi.hoisted(() => ({
	getClusterInfo: vi.fn(),
	getClusterProcessInfo: vi.fn(),
}));

vi.mock('@n8n/rest-api-client/api/instance-registry', () => ({
	getClusterInfo: mocks.getClusterInfo,
}));

vi.mock('@n8n/rest-api-client/api/cluster-info', () => ({
	getClusterProcessInfo: mocks.getClusterProcessInfo,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: 'http://localhost', sessionId: 'test' },
	}),
}));

const SAMPLE_RESPONSE: ClusterInfoResponse = {
	instances: [
		{
			schemaVersion: 1,
			instanceKey: 'main-1',
			hostId: 'host-a',
			instanceType: 'main',
			instanceRole: 'leader',
			version: '1.110.0',
			registeredAt: 0,
			lastSeen: 0,
		},
	],
	checks: {},
};

describe('useInstanceRegistryStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		mocks.getClusterInfo.mockReset();
		mocks.getClusterProcessInfo.mockReset();
	});

	it('fetches and stores cluster info', async () => {
		mocks.getClusterInfo.mockResolvedValue(SAMPLE_RESPONSE);

		const store = useInstanceRegistryStore();
		await store.fetchClusterInfo();

		expect(mocks.getClusterInfo).toHaveBeenCalledTimes(1);
		expect(store.clusterInfo).toEqual(SAMPLE_RESPONSE);
		expect(store.isAvailable).toBe(true);
	});

	it('swallows errors and preserves the prior snapshot', async () => {
		mocks.getClusterInfo.mockResolvedValueOnce(SAMPLE_RESPONSE);
		mocks.getClusterInfo.mockRejectedValueOnce(new Error('endpoint failure'));
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		const store = useInstanceRegistryStore();
		await store.fetchClusterInfo();
		await store.fetchClusterInfo();

		expect(store.clusterInfo).toEqual(SAMPLE_RESPONSE);
		expect(debugSpy).toHaveBeenCalled();
		debugSpy.mockRestore();
	});

	it('fetches and stores the cluster process info', async () => {
		const clusterInfo: ClusterInfo = {
			self: {
				pid: 4321,
				role: 'main',
				isLeader: true,
				uptimeSeconds: 12,
				memoryUsageMb: 64,
				transports: { cache: 'ipc' },
				respawnCount: 1,
			},
			processes: [
				{
					pid: 4321,
					role: 'main',
					isLeader: true,
					uptimeSeconds: 12,
					memoryUsageMb: 64,
					transports: { cache: 'ipc' },
					respawnCount: 1,
				},
			],
		};
		mocks.getClusterProcessInfo.mockResolvedValue(clusterInfo);

		const store = useInstanceRegistryStore();
		await store.fetchClusterProcessInfo();

		expect(mocks.getClusterProcessInfo).toHaveBeenCalledTimes(1);
		expect(store.clusterProcessInfo).toEqual(clusterInfo);
	});

	it('swallows cluster process info errors', async () => {
		mocks.getClusterProcessInfo.mockRejectedValueOnce(new Error('boom'));
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		const store = useInstanceRegistryStore();
		await store.fetchClusterProcessInfo();

		expect(store.clusterProcessInfo).toBeNull();
		expect(debugSpy).toHaveBeenCalled();
		debugSpy.mockRestore();
	});
});
