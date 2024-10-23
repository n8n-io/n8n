import type { FrontendSettings } from '@n8n/api-types';
import { createPinia, setActivePinia } from 'pinia';
import { mock } from 'vitest-mock-extended';
import { useSettingsStore } from './settings.store';

const { getSettings } = vi.hoisted(() => ({
	getSettings: vi.fn(),
}));

const { sessionStarted } = vi.hoisted(() => ({
	sessionStarted: vi.fn(),
}));

vi.mock('@/api/settings', () => ({
	getSettings,
}));

vi.mock('@/api/events', () => ({
	sessionStarted,
}));

vi.mock('@/stores/root.store', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: {},
		setVersionCli: vi.fn(),
	})),
}));

vi.mock('@/stores/root.store', () => ({
	useRootStore: vi.fn(() => ({
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
		setVersionNotificationSettings: vi.fn(),
	})),
}));

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
});
