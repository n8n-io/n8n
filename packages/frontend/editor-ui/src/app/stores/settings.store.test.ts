import type { FrontendSettings } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import { useSettingsStore } from './settings.store';

const mockRootStore = {
	restApiContext: {},
	setUrlBaseWebhook: vi.fn(),
	setUrlBaseEditor: vi.fn(),
	setEndpointForm: vi.fn(),
	setEndpointFormTest: vi.fn(),
	setEndpointFormWaiting: vi.fn(),
	setEndpointWebhook: vi.fn(),
	setEndpointWebhookTest: vi.fn(),
	setEndpointWebhookWaiting: vi.fn(),
	setEndpointMcp: vi.fn(),
	setEndpointMcpTest: vi.fn(),
	setTimezone: vi.fn(),
	setExecutionTimeout: vi.fn(),
	setMaxExecutionTimeout: vi.fn(),
	setInstanceId: vi.fn(),
	setOauthCallbackUrls: vi.fn(),
	setN8nMetadata: vi.fn(),
	setDefaultLocale: vi.fn(),
	setBinaryDataMode: vi.fn(),
	setVersionCli: vi.fn(),
};

const { getSettings, useRootStore } = vi.hoisted(() => ({
	getSettings: vi.fn(),
	useRootStore: vi.fn(() => mockRootStore),
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
	useRootStore,
}));

vi.mock('@/app/stores/versions.store', () => ({
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
	releaseChannel: 'stable',
	authCookie: { secure: true },
	oauthCallbackUrls: {
		oauth1: 'https://oauth1.example.com',
		oauth2: 'https://oauth2.example.com',
	},
	defaultLocale: 'en',
	instanceId: '1234567890',
	telemetry: {
		enabled: false,
	},
});

describe('settings.store', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
	});

	describe('getSettings', () => {
		describe('telemetry', () => {
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

		describe('settingsMode', () => {
			it('should only set public settings if settingsMode is "public"', async () => {
				getSettings.mockResolvedValueOnce({
					...mockSettings,
					settingsMode: 'public',
					telemetry: {
						enabled: true,
						config: {
							url: 'https://telemetry.example.com',
							key: 'telemetry-key',
						},
					},
				});
				const settingsStore = useSettingsStore();

				await settingsStore.getSettings();

				// ensure that settings store is also initialized
				expect(settingsStore.settings.releaseChannel).toEqual(mockSettings.releaseChannel);

				// root store
				expect(mockRootStore.setOauthCallbackUrls).toHaveBeenCalledWith(
					mockSettings.oauthCallbackUrls,
				);
				expect(mockRootStore.setDefaultLocale).toHaveBeenCalledWith(mockSettings.defaultLocale);
				expect(mockRootStore.setInstanceId).toHaveBeenCalledWith(mockSettings.instanceId);

				// non-minimal settings are not set on root store
				expect(mockRootStore.setUrlBaseWebhook).not.toHaveBeenCalled();
				expect(mockRootStore.setUrlBaseEditor).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointForm).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointFormTest).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointFormWaiting).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointWebhook).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointWebhookTest).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointWebhookWaiting).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointMcp).not.toHaveBeenCalled();
				expect(mockRootStore.setEndpointMcpTest).not.toHaveBeenCalled();
				expect(mockRootStore.setTimezone).not.toHaveBeenCalled();
				expect(mockRootStore.setExecutionTimeout).not.toHaveBeenCalled();
				expect(mockRootStore.setMaxExecutionTimeout).not.toHaveBeenCalled();
				expect(mockRootStore.setN8nMetadata).not.toHaveBeenCalled();
				expect(mockRootStore.setBinaryDataMode).not.toHaveBeenCalled();

				// side effects
				expect(sessionStarted).toHaveBeenCalled();
			});

			it('should store full settings if settingsMode is not "minimal"', async () => {
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
				const settingsStore = useSettingsStore();

				await settingsStore.getSettings();

				// root store
				expect(mockRootStore.setUrlBaseWebhook).toHaveBeenCalled();
				expect(mockRootStore.setUrlBaseEditor).toHaveBeenCalled();
				expect(mockRootStore.setEndpointForm).toHaveBeenCalled();
				expect(mockRootStore.setEndpointFormTest).toHaveBeenCalled();
				expect(mockRootStore.setEndpointFormWaiting).toHaveBeenCalled();
				expect(mockRootStore.setEndpointWebhook).toHaveBeenCalled();
				expect(mockRootStore.setEndpointWebhookTest).toHaveBeenCalled();
				expect(mockRootStore.setEndpointWebhookWaiting).toHaveBeenCalled();
				expect(mockRootStore.setEndpointMcp).toHaveBeenCalled();
				expect(mockRootStore.setEndpointMcpTest).toHaveBeenCalled();
				expect(mockRootStore.setTimezone).toHaveBeenCalled();
				expect(mockRootStore.setExecutionTimeout).toHaveBeenCalled();
				expect(mockRootStore.setMaxExecutionTimeout).toHaveBeenCalled();
				expect(mockRootStore.setInstanceId).toHaveBeenCalled();
				expect(mockRootStore.setOauthCallbackUrls).toHaveBeenCalled();
				expect(mockRootStore.setN8nMetadata).toHaveBeenCalled();
				expect(mockRootStore.setDefaultLocale).toHaveBeenCalled();
				expect(mockRootStore.setBinaryDataMode).toHaveBeenCalled();

				// side effects
				expect(sessionStarted).toHaveBeenCalled();
			});
		});
	});
});
