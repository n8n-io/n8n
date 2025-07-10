import type { FrontendSettings } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import { useSettingsStore } from './settings.store';
import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';

const { getSettings } = vi.hoisted(() => ({
	getSettings: vi.fn(),
}));

const { sessionStarted } = vi.hoisted(() => ({
	sessionStarted: vi.fn(),
}));

vi.mock('@n8n/rest-api-client/api/settings', () => ({
	getSettings,
}));

vi.mock('@n8n/rest-api-client/api/events', () => ({
	sessionStarted,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
		setUrlBaseWebhook: vi.fn(),
		setUrlBaseEditor: vi.fn(),
		setEndpointForm: vi.fn(),
		setEndpointFormTest: vi.fn(),
		setEndpointFormWaiting: vi.fn(),
		setEndpointWebhook: vi.fn(),
		setEndpointWebhookTest: vi.fn(),
		setEndpointWebhookWaiting: vi.fn(),
		setTimezone: vi.fn(),
		setExecutionTimeout: vi.fn(),
		setMaxExecutionTimeout: vi.fn(),
		setInstanceId: vi.fn(),
		setOauthCallbackUrls: vi.fn(),
		setN8nMetadata: vi.fn(),
		setDefaultLocale: vi.fn(),
		setBinaryDataMode: vi.fn(),
		setVersionCli: vi.fn(),
	})),
}));

vi.mock('@/stores/versions.store', () => ({
	useVersionsStore: vi.fn(() => ({
		initialize: vi.fn(),
	})),
}));

vi.mock('@vueuse/core', async () => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const originalModule = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core');

	return {
		...originalModule,
		useLocalStorage: vi.fn().mockReturnValue({ value: undefined }),
	};
});

const mockSettings = mock<FrontendSettings>({
	authCookie: { secure: true },
});

describe('settings.store', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		setActivePinia(createPinia());
	});

	describe('getSettings', () => {
		it('should fetch settings and call sessionStarted if telemetry is enabled', async () => {
			const settingsStore = useSettingsStore();

			getSettings.mockResolvedValueOnce({
				...mockSettings,
				telemetry: {
					enabled: true,
					config: {
						url: 'https://telemetry.example.com',
						key: 'telemetry-key',
					},
				},
			});

			await settingsStore.getSettings();
			expect(getSettings).toHaveBeenCalled();
			expect(sessionStarted).toHaveBeenCalled();
		});

		it('should fetch settings and skip calling sessionStarted if telemetry is disabled', async () => {
			const settingsStore = useSettingsStore();

			getSettings.mockResolvedValueOnce({
				...mockSettings,
				telemetry: {
					enabled: false,
				},
			});

			await settingsStore.getSettings();
			expect(getSettings).toHaveBeenCalled();
			expect(sessionStarted).not.toHaveBeenCalled();
		});
	});

	describe('partialExecutionVersion', () => {
		it.each([
			{
				name: 'pick the default',
				default: 1 as const,
				userVersion: -1,
				result: 1,
			},
			{
				name: 'pick the default',
				default: 2 as const,
				userVersion: -1,
				result: 2,
			},
			{
				name: "pick the user's choice",
				default: 1 as const,
				userVersion: 2,
				result: 2,
			},
			{
				name: 'handle values that used to be allowed in local storage',
				default: 1 as const,
				userVersion: 0,
				result: 1,
			},
		])('%name', async ({ default: defaultVersion, userVersion, result }) => {
			const settingsStore = useSettingsStore();

			settingsStore.settings.partialExecution = {
				version: defaultVersion,
			};
			vi.mocked(useLocalStorage).mockReturnValueOnce(ref(userVersion));

			expect(settingsStore.partialExecutionVersion).toBe(result);
		});
	});
});
