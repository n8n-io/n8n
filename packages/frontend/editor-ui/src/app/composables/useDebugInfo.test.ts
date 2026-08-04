import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ClusterInfoResponse } from '@n8n/api-types';
import { useDebugInfo } from './useDebugInfo';
import type { RootStoreState } from '@n8n/stores/useRootStore';
import type { useSettingsStore as useSettingsStoreType } from '@/app/stores/settings.store';
import type { RecursivePartial } from '@/app/types/utils';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: (): Partial<RootStoreState> => ({
		versionCli: '0.123.0',
	}),
}));

const MOCK_BASE_SETTINGS: RecursivePartial<ReturnType<typeof useSettingsStoreType>> = {
	isDocker: true,
	deploymentType: 'cloud',
	nodeJsVersion: '14.17.0',
	nodeEnv: 'production',
	databaseType: 'postgresdb',
	isQueueModeEnabled: false,
	settings: {
		concurrency: 10,
		license: {
			consumerId: 'consumer-id',
			environment: 'production',
		},
	},
	isCommunityPlan: true,
	consumerId: 'consumer-123',
	saveDataSuccessExecution: 'all',
	saveDataErrorExecution: 'none',
	saveDataProgressExecution: true,
	saveManualExecutions: true,
	binaryDataMode: 'default',
	pruning: {
		isEnabled: true,
		maxAge: 24,
		maxCount: 100,
	},
	security: {
		blockFileAccessToN8nFiles: false,
		secureCookie: false,
	},
};

const { useSettingsStore } = vi.hoisted(() => ({
	useSettingsStore: vi.fn(),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore,
}));

vi.mock('@n8n/composables/useDeviceSupport', () => ({
	useDeviceSupport: () => ({
		isTouchDevice: false,
		userAgent: 'Mozilla/5.0',
	}),
}));

const { mockClusterInfo } = vi.hoisted(() => ({
	mockClusterInfo: { value: null as ClusterInfoResponse | null },
}));

vi.mock('@/features/instanceRegistry/stores/instanceRegistry.store', () => ({
	useInstanceRegistryStore: () => ({
		get clusterInfo() {
			return mockClusterInfo.value;
		},
		get isAvailable() {
			return mockClusterInfo.value !== null;
		},
		fetchClusterInfo: vi.fn(),
	}),
}));

const NOW = 1717602004819;

vi.useFakeTimers({
	now: NOW,
});

describe('useDebugInfo', () => {
	beforeEach(() => {
		useSettingsStore.mockReturnValue(MOCK_BASE_SETTINGS);
		mockClusterInfo.value = null;
	});

	it('should generate debug info', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).toMatchSnapshot();
	});

	it('should generate debug info without sensitive data', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo({ skipSensitive: true });

		expect(debugInfo).not.toContain('consumerId');
		expect(debugInfo).toContain('Generated at:');
	});

	it('should include security info if insecure settings are found', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).toContain('blockFileAccessToN8nFiles: false');
		expect(debugInfo).toContain('secureCookie: false');
	});

	it('should not include security info if all settings are secure', () => {
		useSettingsStore.mockReturnValue({
			...MOCK_BASE_SETTINGS,
			security: {
				...MOCK_BASE_SETTINGS.security,
				blockFileAccessToN8nFiles: true,
				secureCookie: true,
			},
		});

		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).not.toContain('blockFileAccessToN8nFiles');
		expect(debugInfo).not.toContain('secureCookie');
	});

	it('should generate markdown with secondary headers', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo({ secondaryHeader: true });

		expect(debugInfo).toContain('### core');
		expect(debugInfo).toContain('## Debug info');
	});

	it('should not include cluster section when registry has no snapshot', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).not.toContain('## cluster');
	});

	it('should include cluster section when registry has data', () => {
		mockClusterInfo.value = {
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
				{
					schemaVersion: 1,
					instanceKey: 'worker-1',
					hostId: 'host-b',
					instanceType: 'worker',
					instanceRole: 'follower',
					version: '1.111.0',
					registeredAt: 0,
					lastSeen: 0,
				},
			],
			checks: {
				'version-mismatch': {
					check: 'version-mismatch',
					executedAt: 0,
					status: 'failed',
					warnings: [
						{
							check: 'version-mismatch',
							code: 'cluster.version-mismatch',
							message: 'Detected multiple n8n versions in the cluster: 1.110.0, 1.111.0',
							severity: 'error',
						},
					],
				},
				'hostid-clash': {
					check: 'hostid-clash',
					executedAt: 0,
					status: 'succeeded',
					warnings: [],
				},
			},
		};

		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).toContain('## cluster');
		expect(debugInfo).toContain('instanceCount: 2');
		expect(debugInfo).toContain('versions: 1.110.0, 1.111.0');
		expect(debugInfo).toContain('instanceKey: main-1');
		expect(debugInfo).toContain('instanceKey: worker-1');
		expect(debugInfo).toContain('check: hostid-clash, status: succeeded, warnings: -');
		expect(debugInfo).toContain(
			'check: version-mismatch, status: failed, warnings: cluster.version-mismatch',
		);
	});

	it('should include cluster section even when skipSensitive is true', () => {
		mockClusterInfo.value = {
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

		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo({ skipSensitive: true });

		expect(debugInfo).toContain('## cluster');
		expect(debugInfo).toContain('instanceCount: 1');
	});
});
