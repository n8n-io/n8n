import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDebugInfo } from './useDebugInfo';
import type { RootStoreState } from '@n8n/stores/useRootStore';
import type { useSettingsStore as useSettingsStoreType } from '@/stores/settings.store';
import type { RecursivePartial } from '@/type-utils';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: (): Partial<RootStoreState> => ({
		versionCli: '0.123.0',
	}),
}));

const MOCK_BASE_SETTINGS: RecursivePartial<ReturnType<typeof useSettingsStoreType>> = {
	isDocker: true,
	deploymentType: 'cloud',
	nodeJsVersion: '14.17.0',
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

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore,
}));

vi.mock('@n8n/composables/useDeviceSupport', () => ({
	useDeviceSupport: () => ({
		isTouchDevice: false,
		userAgent: 'Mozilla/5.0',
	}),
}));

const NOW = 1717602004819;

vi.useFakeTimers({
	now: NOW,
});

describe('useDebugInfo', () => {
	beforeEach(() => {
		useSettingsStore.mockReturnValue(MOCK_BASE_SETTINGS);
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
});
