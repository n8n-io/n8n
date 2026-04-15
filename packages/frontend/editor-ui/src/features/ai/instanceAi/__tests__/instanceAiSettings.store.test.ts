import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendModuleSettings } from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/rest' },
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		addEventListener: vi.fn(),
	}),
}));

const mockFetchSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockFetchPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockFetchModelCredentials = vi.fn().mockResolvedValue([]);
const mockFetchServiceCredentials = vi.fn().mockResolvedValue([]);

vi.mock('../instanceAi.settings.api', () => ({
	fetchSettings: (...args: unknown[]) => mockFetchSettings(...args),
	updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
	fetchPreferences: (...args: unknown[]) => mockFetchPreferences(...args),
	updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
	fetchModelCredentials: (...args: unknown[]) => mockFetchModelCredentials(...args),
	fetchServiceCredentials: (...args: unknown[]) => mockFetchServiceCredentials(...args),
}));

vi.mock('../instanceAi.api', () => ({
	createGatewayLink: vi.fn(),
	getGatewayStatus: vi.fn(),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(false),
}));

function setModuleSettings(
	settingsStore: ReturnType<typeof useSettingsStore>,
	instanceAi: FrontendModuleSettings['instance-ai'],
) {
	settingsStore.moduleSettings = { 'instance-ai': instanceAi };
}

describe('useInstanceAiSettingsStore', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createPinia());
		store = useInstanceAiSettingsStore();
		settingsStore = useSettingsStore();
	});

	describe('isInstanceAiDisabled', () => {
		it('returns true when module settings has enabled=false', () => {
			setModuleSettings(settingsStore, {
				enabled: false,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isInstanceAiDisabled).toBe(true);
		});

		it('returns false when module settings has enabled=true', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isInstanceAiDisabled).toBe(false);
		});

		it('returns true when module settings is undefined', () => {
			settingsStore.moduleSettings = {};
			expect(store.isInstanceAiDisabled).toBe(true);
		});
	});

	describe('isLocalGatewayDisabledByAdmin', () => {
		it('defaults to true when module settings have not loaded yet', () => {
			settingsStore.moduleSettings = {};
			expect(store.isLocalGatewayDisabledByAdmin).toBe(true);
		});

		it('returns true when admin flag is set', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: true,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isLocalGatewayDisabledByAdmin).toBe(true);
		});

		it('returns false when admin flag is not set even if user preference is', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			store.$patch({ preferences: { localGatewayDisabled: true } });
			expect(store.isLocalGatewayDisabledByAdmin).toBe(false);
		});
	});

	describe('isLocalGatewayDisabled', () => {
		it('returns true when admin flag is set', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: true,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isLocalGatewayDisabled).toBe(true);
		});

		it('returns true when user preference is set', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			store.$patch({ preferences: { localGatewayDisabled: true } });
			expect(store.isLocalGatewayDisabled).toBe(true);
		});

		it('returns true when both admin flag and user preference are set', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: true,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			store.$patch({ preferences: { localGatewayDisabled: true } });
			expect(store.isLocalGatewayDisabled).toBe(true);
		});

		it('returns false when neither admin flag nor user preference is set', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			store.$patch({ preferences: { localGatewayDisabled: false } });
			expect(store.isLocalGatewayDisabled).toBe(false);
		});
	});

	describe('isProxyEnabled', () => {
		it('returns true when proxyEnabled is true in module settings', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: true,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isProxyEnabled).toBe(true);
		});

		it('returns false when proxyEnabled is false', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isProxyEnabled).toBe(false);
		});
	});

	describe('isCloudManaged', () => {
		it('returns true when cloudManaged is true in module settings', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: true,
			});
			expect(store.isCloudManaged).toBe(true);
		});

		it('returns false when cloudManaged is false', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				optinModalDismissed: false,
				cloudManaged: false,
			});
			expect(store.isCloudManaged).toBe(false);
		});
	});

	describe('refreshModuleSettings', () => {
		it('fetches preferences when they are not loaded yet', async () => {
			const prefsResponse = {
				credentialId: null,
				credentialType: null,
				credentialName: null,
				modelName: 'gpt-4',
				localGatewayDisabled: false,
			};
			mockFetchPreferences.mockResolvedValue(prefsResponse);
			settingsStore.getModuleSettings = vi.fn().mockResolvedValue(undefined);

			await store.refreshModuleSettings();

			expect(mockFetchPreferences).toHaveBeenCalled();
			expect(store.preferences).toEqual(prefsResponse);
		});

		it('does not fetch preferences when they are already loaded', async () => {
			store.$patch({
				preferences: {
					credentialId: null,
					credentialType: null,
					credentialName: null,
					modelName: 'gpt-4',
					localGatewayDisabled: false,
				},
			});
			settingsStore.getModuleSettings = vi.fn().mockResolvedValue(undefined);

			await store.refreshModuleSettings();

			expect(mockFetchPreferences).not.toHaveBeenCalled();
		});
	});

	describe('syncInstanceAiFlagIntoGlobalModuleSettings', () => {
		it('preserves cloudManaged when syncing admin settings', async () => {
			setModuleSettings(settingsStore, {
				enabled: false,
				localGatewayDisabled: false,
				proxyEnabled: true,
				optinModalDismissed: false,
				cloudManaged: true,
			});

			const adminResponse = {
				enabled: true,
				lastMessages: 20,
				embedderModel: '',
				semanticRecallTopK: 5,
				subAgentMaxSteps: 10,
				browserMcp: false,
				permissions: {},
				mcpServers: '',
				sandboxEnabled: false,
				sandboxProvider: '',
				sandboxImage: '',
				sandboxTimeout: 60,
				daytonaCredentialId: null,
				n8nSandboxCredentialId: null,
				searchCredentialId: null,
				localGatewayDisabled: false,
				optinModalDismissed: true,
			};

			mockUpdateSettings.mockResolvedValue(adminResponse);
			settingsStore.getModuleSettings = vi.fn().mockResolvedValue(undefined);

			// persistEnabled triggers syncInstanceAiFlagIntoGlobalModuleSettings
			await store.persistEnabled(true);

			const ms = settingsStore.moduleSettings['instance-ai'];
			expect(ms?.cloudManaged).toBe(true);
			expect(ms?.proxyEnabled).toBe(true);
			expect(ms?.enabled).toBe(true);
		});
	});
});
