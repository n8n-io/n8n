import type { FrontendSettings } from '@n8n/api-types';
import { i18n } from '@n8n/i18n';
import { createPinia, setActivePinia } from 'pinia';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { useSettingsStore } from './settings.store';

const mockRootStore = {
	restApiContext: {},
	setUrlBaseWebhook: vi.fn(),
	setUrlBaseEditor: vi.fn(),
	setUrlBaseWebhookTest: vi.fn(),
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
	setJwksUri: vi.fn(),
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

vi.mock('./useRootStore', () => ({
	useRootStore,
}));

vi.mock('@vueuse/core', async () => {
	const originalModule = await vi.importActual('@vueuse/core');

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

	describe('isAutosaveEnabled', () => {
		it('should return true when workflowsAutosaveDisabled is false', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				workflowsAutosaveDisabled: false,
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isAutosaveEnabled).toBe(true);
		});

		it('should return false when workflowsAutosaveDisabled is true', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				workflowsAutosaveDisabled: true,
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isAutosaveEnabled).toBe(false);
		});

		it('should return true when workflowsAutosaveDisabled is undefined', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				workflowsAutosaveDisabled: undefined,
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isAutosaveEnabled).toBe(true);
		});
	});

	describe('isCrdtCollaborationEnabled', () => {
		it('should return true when collaboration.crdt is local', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				collaboration: { crdt: 'local' },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isCrdtCollaborationEnabled).toBe(true);
		});

		it('should return true when collaboration.crdt is server', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				collaboration: { crdt: 'server' },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isCrdtCollaborationEnabled).toBe(true);
		});

		it('should return false when collaboration.crdt is off', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				collaboration: { crdt: 'off' },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isCrdtCollaborationEnabled).toBe(false);
		});

		it('should return false when collaboration is undefined', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				collaboration: undefined,
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isCrdtCollaborationEnabled).toBe(false);
		});
	});

	describe('insecure connection warning', () => {
		let writeSpy: MockInstance<(...text: string[]) => void>;

		beforeEach(() => {
			writeSpy = vi.spyOn(document, 'write').mockImplementation(() => {});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should render the localized warning over an insecure, non-localhost origin', async () => {
			vi.stubGlobal('location', { protocol: 'http:', hostname: 'n8n.example.com' });

			getSettings.mockResolvedValueOnce({ ...mockSettings, authCookie: { secure: true } });

			await useSettingsStore().getSettings();

			expect(writeSpy).toHaveBeenCalledTimes(1);
			const markup = writeSpy.mock.calls[0][0];
			expect(markup).toContain(i18n.baseText('settings.authCookie.insecureConnection.title'));
			expect(markup).toContain('N8N_SECURE_COOKIE');
			expect(markup).toContain('http://localhost:5678');
		});

		it('should not render the warning over localhost in a non-Safari browser', async () => {
			vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost' });
			vi.stubGlobal('navigator', {
				userAgent:
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0',
			});

			getSettings.mockResolvedValueOnce({ ...mockSettings, authCookie: { secure: true } });

			await useSettingsStore().getSettings();

			expect(writeSpy).not.toHaveBeenCalled();
		});

		it('should not render the warning when the cookie is not secure', async () => {
			vi.stubGlobal('location', { protocol: 'http:', hostname: 'n8n.example.com' });

			getSettings.mockResolvedValueOnce({ ...mockSettings, authCookie: { secure: false } });

			await useSettingsStore().getSettings();

			expect(writeSpy).not.toHaveBeenCalled();
		});
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
				});
				const settingsStore = useSettingsStore();

				await settingsStore.getSettings();

				// ensure that settings store is also initialized
				expect(settingsStore.settings.releaseChannel).toEqual(mockSettings.releaseChannel);

				// non-minimal settings are not set on root store
				expect(mockRootStore.setOauthCallbackUrls).not.toHaveBeenCalledWith(
					mockSettings.oauthCallbackUrls,
				);
				expect(mockRootStore.setDefaultLocale).toHaveBeenCalledWith(mockSettings.defaultLocale);
				expect(mockRootStore.setInstanceId).not.toHaveBeenCalledWith(mockSettings.instanceId);
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
				expect(sessionStarted).not.toHaveBeenCalled();
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

	describe('isWorkflowPublicationServiceEnabled', () => {
		it('should return true when useWorkflowPublicationService is true', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				useWorkflowPublicationService: true,
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isWorkflowPublicationServiceEnabled).toBe(true);
		});

		it('should return false when useWorkflowPublicationService is undefined', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				useWorkflowPublicationService: undefined,
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();

			expect(settingsStore.isWorkflowPublicationServiceEnabled).toBe(false);
		});
	});

	describe('isOtelCustomSpanAttributesEnabled', () => {
		it('should return false when otel module is not active', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				activeModules: [],
				enterprise: { otelCustomSpanAttributes: true },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();
			settingsStore.moduleSettings = {
				otel: {
					enabled: true,
				},
			};

			expect(settingsStore.isOtelCustomSpanAttributesEnabled).toBe(false);
		});

		it('should return false when otel module is active but not enabled in moduleSettings', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				activeModules: ['otel'],
				enterprise: { otelCustomSpanAttributes: true },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();
			settingsStore.moduleSettings = {
				otel: {
					enabled: false,
				},
			};

			expect(settingsStore.isOtelCustomSpanAttributesEnabled).toBe(false);
		});

		it('should return false when otel module is active and enabled but not licensed', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				activeModules: ['otel'],
				enterprise: { otelCustomSpanAttributes: false },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();
			settingsStore.moduleSettings = {
				otel: {
					enabled: true,
				},
			};

			expect(settingsStore.isOtelCustomSpanAttributesEnabled).toBe(false);
		});

		it('should return true when otel module is active, enabled, and licensed', async () => {
			getSettings.mockResolvedValueOnce({
				...mockSettings,
				activeModules: ['otel'],
				enterprise: { otelCustomSpanAttributes: true },
			});

			const settingsStore = useSettingsStore();
			await settingsStore.getSettings();
			settingsStore.moduleSettings = {
				otel: {
					enabled: true,
				},
			};

			expect(settingsStore.isOtelCustomSpanAttributesEnabled).toBe(true);
		});
	});
});
