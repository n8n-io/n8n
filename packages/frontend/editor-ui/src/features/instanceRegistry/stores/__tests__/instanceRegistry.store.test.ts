import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { setActivePinia, createPinia } from 'pinia';
import type { ClusterInfoResponse } from '@n8n/api-types';
import { useInstanceRegistryStore } from '../instanceRegistry.store';

const mocks = vi.hoisted(() => ({
	getClusterInfo: vi.fn(),
	envFeatureFlagCheck: vi.fn(),
}));

vi.mock('@n8n/rest-api-client/api/instance-registry', () => ({
	getClusterInfo: mocks.getClusterInfo,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: 'http://localhost', sessionId: 'test' },
	}),
}));

vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: () => ({
		check: ref(mocks.envFeatureFlagCheck),
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
		mocks.envFeatureFlagCheck.mockReset();
	});

	it('skips fetch when env feature flag is disabled', async () => {
		mocks.envFeatureFlagCheck.mockReturnValue(false);

		const store = useInstanceRegistryStore();
		await store.fetchClusterInfo();

		expect(mocks.getClusterInfo).not.toHaveBeenCalled();
		expect(store.clusterInfo).toBeNull();
		expect(store.isAvailable).toBe(false);
	});

	it('fetches and stores cluster info when feature flag is enabled', async () => {
		mocks.envFeatureFlagCheck.mockReturnValue(true);
		mocks.getClusterInfo.mockResolvedValue(SAMPLE_RESPONSE);

		const store = useInstanceRegistryStore();
		await store.fetchClusterInfo();

		expect(mocks.getClusterInfo).toHaveBeenCalledTimes(1);
		expect(store.clusterInfo).toEqual(SAMPLE_RESPONSE);
		expect(store.isAvailable).toBe(true);
	});

	it('swallows errors and preserves the prior snapshot', async () => {
		mocks.envFeatureFlagCheck.mockReturnValue(true);
		mocks.getClusterInfo.mockResolvedValueOnce(SAMPLE_RESPONSE);
		mocks.getClusterInfo.mockRejectedValueOnce(new Error('endpoint 404'));
		const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

		const store = useInstanceRegistryStore();
		await store.fetchClusterInfo();
		await store.fetchClusterInfo();

		expect(store.clusterInfo).toEqual(SAMPLE_RESPONSE);
		expect(debugSpy).toHaveBeenCalled();
		debugSpy.mockRestore();
	});
});
