import type { Mock } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDebugInfo } from './useDebugInfo';
import { useRootStore } from '@/stores/root.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useDeviceSupport } from 'n8n-design-system';
import type { RootState } from '@/Interface';

vi.mock('@/stores/root.store');
vi.mock('@/stores/settings.store');
vi.mock('n8n-design-system');

type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer U>
		? Array<RecursivePartial<U>>
		: T[P] extends object | undefined
			? RecursivePartial<T[P]>
			: T[P];
};

const mockDate = new Date(2022, 0, 1);
vi.setSystemTime(mockDate);

describe('useDebugInfo', () => {
	let rootStoreMock: RecursivePartial<RootState>;
	let settingsStoreMock: RecursivePartial<ReturnType<typeof useSettingsStore>>;
	let deviceSupportMock: RecursivePartial<ReturnType<typeof useDeviceSupport>>;

	beforeEach(() => {
		rootStoreMock = {
			versionCli: '0.123.0',
		};
		settingsStoreMock = {
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
		deviceSupportMock = {
			isTouchDevice: false,
			userAgent: 'Mozilla/5.0',
		};

		(useRootStore as unknown as Mock).mockReturnValue(rootStoreMock);
		(useSettingsStore as unknown as Mock).mockReturnValue(settingsStoreMock);
		(useDeviceSupport as unknown as Mock).mockReturnValue(deviceSupportMock);
	});

	it('should generate debug info', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).toEqual(`# Debug info

## core

- n8nVersion: 0.123.0
- platform: docker (cloud)
- nodeJsVersion: 14.17.0
- database: postgres
- executionMode: regular
- concurrency: 10
- license: community
- consumerId: consumer-123

## storage

- success: all
- error: none
- progress: true
- manual: true
- binaryMode: memory

## pruning

- enabled: true
- maxAge: 24 hours
- maxCount: 100 executions

## client

- userAgent: Mozilla/5.0
- isTouchDevice: false

## security

- blockFileAccessToN8nFiles: false
- secureCookie: false

Generated at: 2021-12-31T23:00:00.000Z`);
	});

	it('should generate debug info without sensitive data', () => {
		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo({ skipSensitive: true });

		expect(debugInfo).not.toContain('consumerId');
		expect(debugInfo).toContain('Generated at:');
	});

	it('should include security info if insecure settings are found', () => {
		settingsStoreMock.security!.blockFileAccessToN8nFiles = false;
		settingsStoreMock.security!.secureCookie = false;

		const { generateDebugInfo } = useDebugInfo();
		const debugInfo = generateDebugInfo();

		expect(debugInfo).toContain('blockFileAccessToN8nFiles: false');
		expect(debugInfo).toContain('secureCookie: false');
	});

	it('should not include security info if all settings are secure', () => {
		settingsStoreMock.security!.blockFileAccessToN8nFiles = true;
		settingsStoreMock.security!.secureCookie = true;

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
