import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FrontendModuleSettings, InstanceAiUserPreferencesResponse } from '@n8n/api-types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/rest' },
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showMessage: vi.fn(),
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		addEventListener: vi.fn().mockReturnValue(() => {}),
		isConnected: false,
	}),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(false),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: (key: string) => key },
}));

const mockFetchSettings = vi.fn();
const mockUpdateSettings = vi.fn();
const mockFetchPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockFetchServiceCredentials = vi.fn().mockResolvedValue([]);
const mockFetchInstanceModelCredentials = vi.fn().mockResolvedValue([]);
const mockFetchModelCatalog = vi.fn();
const mockVerifyModel = vi.fn();
const mockVerifySandbox = vi.fn();
const mockVerifySearch = vi.fn();
const mockCreateGatewayLink = vi.fn();
const mockDisconnectGatewaySession = vi.fn();
const mockCreateBrowserLink = vi.fn();
const mockDisconnectBrowserSession = vi.fn();
const mockGetBrowserStatus = vi.fn();

vi.mock('../instanceAi.settings.api', () => ({
	fetchSettings: (...args: unknown[]) => mockFetchSettings(...args),
	updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
	fetchPreferences: (...args: unknown[]) => mockFetchPreferences(...args),
	updatePreferences: (...args: unknown[]) => mockUpdatePreferences(...args),
	fetchServiceCredentials: (...args: unknown[]) => mockFetchServiceCredentials(...args),
	fetchInstanceModelCredentials: (...args: unknown[]) => mockFetchInstanceModelCredentials(...args),
	fetchModelCatalog: (...args: unknown[]) => mockFetchModelCatalog(...args),
	verifyModel: (...args: unknown[]) => mockVerifyModel(...args),
	verifySandbox: (...args: unknown[]) => mockVerifySandbox(...args),
	verifySearch: (...args: unknown[]) => mockVerifySearch(...args),
}));

const mockGetGatewayStatus = vi.fn();
vi.mock('../instanceAi.api', () => ({
	createGatewayLink: (...args: unknown[]) => mockCreateGatewayLink(...args),
	disconnectGatewaySession: (...args: unknown[]) => mockDisconnectGatewaySession(...args),
	getGatewayStatus: (...args: unknown[]) => mockGetGatewayStatus(...args),
	createBrowserLink: (...args: unknown[]) => mockCreateBrowserLink(...args),
	disconnectBrowserSession: (...args: unknown[]) => mockDisconnectBrowserSession(...args),
	getBrowserStatus: (...args: unknown[]) => mockGetBrowserStatus(...args),
}));

import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';

type InstanceAiModuleSettings = NonNullable<FrontendModuleSettings['instance-ai']>;

function makeModuleSettings(
	overrides: Partial<InstanceAiModuleSettings> = {},
): InstanceAiModuleSettings {
	return {
		enabled: true,
		localGatewayDisabled: false,
		browserUseEnabled: true,
		proxyEnabled: false,
		cloudManaged: false,
		sandboxEnabled: true,
		workflowBuilderAvailable: true,
		sandboxUnavailableReason: null,
		runDebugEnabled: false,
		...overrides,
	};
}

function setModuleSettings(
	settingsStore: ReturnType<typeof useSettingsStore>,
	instanceAi: Partial<InstanceAiModuleSettings>,
) {
	settingsStore.moduleSettings = { 'instance-ai': makeModuleSettings(instanceAi) };
}

function setUserPreference(
	store: ReturnType<typeof useInstanceAiSettingsStore>,
	prefs: Partial<InstanceAiUserPreferencesResponse> | null,
) {
	(store as unknown as { preferences: typeof prefs }).preferences = prefs;
}

describe('useInstanceAiSettingsStore', () => {
	let store: ReturnType<typeof useInstanceAiSettingsStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(hasPermission).mockReturnValue(false);
		setActivePinia(createPinia());
		store = useInstanceAiSettingsStore();
		settingsStore = useSettingsStore();
	});

	describe('permissions', () => {
		it('checks related admin scopes independently', () => {
			vi.mocked(hasPermission)
				.mockReturnValueOnce(true)
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(false);

			expect(store.canManage).toBe(true);
			expect(store.canManageAiUsage).toBe(false);
			expect(store.canManageInstanceCredentials).toBe(false);
			expect(hasPermission).toHaveBeenNthCalledWith(1, ['rbac'], {
				rbac: { scope: 'instanceAi:manage' },
			});
			expect(hasPermission).toHaveBeenNthCalledWith(2, ['rbac'], {
				rbac: { scope: 'aiAssistant:manage' },
			});
			expect(hasPermission).toHaveBeenNthCalledWith(3, ['rbac'], {
				rbac: { scope: 'credential:manageInstance' },
			});
		});
	});

	describe('isInstanceAiDisabled', () => {
		it('returns true when module settings has enabled=false', () => {
			setModuleSettings(settingsStore, {
				enabled: false,
				localGatewayDisabled: false,
				proxyEnabled: false,
				cloudManaged: false,
			});
			expect(store.isInstanceAiDisabled).toBe(true);
		});

		it('returns false when module settings has enabled=true', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
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
				cloudManaged: false,
			});
			expect(store.isLocalGatewayDisabledByAdmin).toBe(true);
		});

		it('returns false when admin flag is not set even if user preference is', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
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
				cloudManaged: false,
			});
			expect(store.isLocalGatewayDisabled).toBe(true);
		});

		it('returns true when user preference is set', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
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
				cloudManaged: false,
			});
			expect(store.isProxyEnabled).toBe(true);
		});

		it('returns false when proxyEnabled is false', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
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
				cloudManaged: true,
			});
			expect(store.isCloudManaged).toBe(true);
		});

		it('returns false when cloudManaged is false', () => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				cloudManaged: false,
			});
			expect(store.isCloudManaged).toBe(false);
		});
	});

	describe('workflow builder availability', () => {
		it('returns false when the module settings mark the builder unavailable', () => {
			setModuleSettings(settingsStore, {
				sandboxEnabled: false,
				workflowBuilderAvailable: false,
				sandboxUnavailableReason: null,
			});

			expect(store.isWorkflowBuilderAvailable).toBe(false);
			expect(store.isSandboxEnabled).toBe(false);
		});

		it('keeps the builder unavailable while the sandbox is enabled', () => {
			setModuleSettings(settingsStore, {
				sandboxEnabled: true,
				workflowBuilderAvailable: false,
				sandboxUnavailableReason: 'N8N_SANDBOX_SERVICE_URL is required.',
			});

			expect(store.isWorkflowBuilderAvailable).toBe(false);
			expect(store.isSandboxEnabled).toBe(true);
		});
	});

	describe('settings persistence', () => {
		const response = {
			enabled: true,
			permissions: {},
			mcpServers: '',
			mcpAccessEnabled: true,
			sandboxEnabled: false,
			sandboxProvider: 'n8n-sandbox',
			sandboxImage: '',
			sandboxTimeout: 60,
			daytonaCredentialId: null,
			n8nSandboxCredentialId: null,
			searchCredentialId: null,
			modelCredentialId: null,
			modelName: null,
			modelEnvConfigured: false,
			sandboxEnvConfigured: false,
			searchEnvConfigured: false,
			localGatewayDisabled: false,
		};

		beforeEach(() => {
			setModuleSettings(settingsStore, { enabled: false });
			mockUpdateSettings.mockResolvedValue(response);
			settingsStore.getModuleSettings = vi.fn().mockRejectedValue(new Error('refresh failed'));
		});

		it('keeps a settings save successful when the module refresh fails', async () => {
			store.setField('mcpAccessEnabled', true);

			await expect(store.save()).resolves.toBe(true);

			expect(store.settings).toEqual(response);
			expect(store.draft).toEqual({});
			expect(settingsStore.moduleSettings['instance-ai']?.enabled).toBe(true);
		});

		it('keeps an enablement save successful when the module refresh fails', async () => {
			await expect(store.persistEnabled(true)).resolves.toBe(true);

			expect(store.settings).toEqual(response);
			expect(settingsStore.moduleSettings['instance-ai']?.enabled).toBe(true);
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

	describe('onboarding verification', () => {
		it('delegates model, sandbox, and search checks to the settings API', async () => {
			mockVerifyModel.mockResolvedValue({ ok: true, latencyMs: 10 });
			mockVerifySandbox.mockResolvedValue({ ok: true, startupMs: 20 });
			mockVerifySearch.mockResolvedValue({ ok: true, resultCount: 10 });
			const modelPayload = { modelName: 'gpt-5.6-sol' };
			const sandboxPayload = { provider: 'n8n-sandbox' as const };
			const searchPayload = {
				connection: { type: 'braveSearchApi', data: { apiKey: 'key' } },
			};

			await expect(store.verifyModel(modelPayload)).resolves.toEqual({ ok: true, latencyMs: 10 });
			await expect(store.verifySandbox(sandboxPayload)).resolves.toEqual({
				ok: true,
				startupMs: 20,
			});
			await expect(store.verifySearch(searchPayload)).resolves.toEqual({
				ok: true,
				resultCount: 10,
			});

			expect(mockVerifyModel).toHaveBeenCalledWith(
				{ baseUrl: 'http://localhost:5678/rest' },
				modelPayload,
			);
			expect(mockVerifySandbox).toHaveBeenCalledWith(
				{ baseUrl: 'http://localhost:5678/rest' },
				sandboxPayload,
			);
			expect(mockVerifySearch).toHaveBeenCalledWith(
				{ baseUrl: 'http://localhost:5678/rest' },
				searchPayload,
			);
		});
	});

	describe('model catalog', () => {
		const response = {
			models: {
				anthropic: [{ id: 'claude-opus-5', name: 'Claude Opus 5' }],
				openai: [],
				openrouter: [],
			},
		};

		it('de-duplicates in-flight requests and keeps the successful catalog', async () => {
			let resolveFetch: (value: typeof response) => void = () => {};
			mockFetchModelCatalog.mockImplementation(
				async () =>
					await new Promise<typeof response>((resolve) => {
						resolveFetch = resolve;
					}),
			);

			const first = store.loadModelCatalog();
			const second = store.loadModelCatalog();
			expect(store.isModelCatalogLoading).toBe(true);
			expect(mockFetchModelCatalog).toHaveBeenCalledOnce();

			resolveFetch(response);
			await Promise.all([first, second]);
			expect(store.modelCatalog).toEqual(response.models);
			expect(store.isModelCatalogLoading).toBe(false);

			await store.loadModelCatalog();
			expect(mockFetchModelCatalog).toHaveBeenCalledOnce();
		});

		it('allows a retry after a failed or empty response', async () => {
			mockFetchModelCatalog
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValueOnce({ models: { anthropic: [], openai: [], openrouter: [] } })
				.mockResolvedValueOnce(response);

			await store.loadModelCatalog();
			expect(store.modelCatalog).toBeNull();
			await store.loadModelCatalog();
			expect(store.modelCatalog).toBeNull();
			await store.loadModelCatalog();

			expect(store.modelCatalog).toEqual(response.models);
			expect(mockFetchModelCatalog).toHaveBeenCalledTimes(3);
		});
	});

	describe('chat panel width preference', () => {
		const preferencesResponse = (chatPanelWidthRatio: number) => ({
			credentialId: null,
			credentialType: null,
			credentialName: null,
			modelName: 'gpt-5',
			localGatewayDisabled: false,
			chatPanelWidthRatio,
		});

		it('serializes updates and keeps the newest ratio', async () => {
			let resolveFirstRequest: (value: InstanceAiUserPreferencesResponse) => void = () => {};
			mockUpdatePreferences
				.mockImplementationOnce(
					async () =>
						await new Promise<InstanceAiUserPreferencesResponse>((resolve) => {
							resolveFirstRequest = resolve;
						}),
				)
				.mockResolvedValueOnce(preferencesResponse(0.7));
			setUserPreference(store, preferencesResponse(0.5));

			const firstUpdate = store.persistChatPanelWidthRatio(0.6);
			await vi.waitFor(() => expect(mockUpdatePreferences).toHaveBeenCalledOnce());
			const secondUpdate = store.persistChatPanelWidthRatio(0.7);

			expect(store.preferences?.chatPanelWidthRatio).toBe(0.7);
			expect(mockUpdatePreferences).toHaveBeenCalledOnce();

			resolveFirstRequest(preferencesResponse(0.6));
			await Promise.all([firstUpdate, secondUpdate]);

			expect(mockUpdatePreferences).toHaveBeenCalledTimes(2);
			expect(mockUpdatePreferences).toHaveBeenNthCalledWith(
				2,
				{ baseUrl: 'http://localhost:5678/rest' },
				{ chatPanelWidthRatio: 0.7 },
			);
			expect(store.preferences?.chatPanelWidthRatio).toBe(0.7);
		});

		it('does not persist an unchanged ratio', async () => {
			setUserPreference(store, preferencesResponse(0.6));

			await store.persistChatPanelWidthRatio(0.6);

			expect(mockUpdatePreferences).not.toHaveBeenCalled();
		});

		it('keeps a saved ratio when an older preference request finishes later', async () => {
			let resolveFetch: (value: InstanceAiUserPreferencesResponse) => void = () => {};
			mockFetchPreferences.mockImplementationOnce(
				async () =>
					await new Promise<InstanceAiUserPreferencesResponse>((resolve) => {
						resolveFetch = resolve;
					}),
			);
			mockUpdatePreferences.mockResolvedValueOnce(preferencesResponse(0.6));

			const loading = store.fetch();
			await vi.waitFor(() => expect(mockFetchPreferences).toHaveBeenCalledOnce());
			await store.persistChatPanelWidthRatio(0.6);
			resolveFetch(preferencesResponse(0.5));
			await loading;

			expect(store.preferences?.chatPanelWidthRatio).toBe(0.6);
		});

		it('restores the confirmed ratio after a failed update and allows a retry', async () => {
			setUserPreference(store, preferencesResponse(0.5));
			mockUpdatePreferences
				.mockRejectedValueOnce(new Error('offline'))
				.mockResolvedValueOnce(preferencesResponse(0.6));

			await store.persistChatPanelWidthRatio(0.6);

			expect(store.preferences?.chatPanelWidthRatio).toBe(0.5);

			await store.persistChatPanelWidthRatio(0.6);

			expect(mockUpdatePreferences).toHaveBeenCalledTimes(2);
			expect(store.preferences?.chatPanelWidthRatio).toBe(0.6);
		});
	});

	describe('provider credentials', () => {
		it('refreshes n8n Sandbox credentials when the assistant proxy is enabled', async () => {
			setModuleSettings(settingsStore, { proxyEnabled: true, cloudManaged: false });
			mockFetchServiceCredentials.mockResolvedValue([
				{ id: 'sandbox-cred', name: 'n8n Sandbox', type: 'httpHeaderAuth' },
			]);

			await store.refreshCredentials();

			expect(mockFetchServiceCredentials).toHaveBeenCalledOnce();
			expect(store.serviceCredentials).toEqual([
				{ id: 'sandbox-cred', name: 'n8n Sandbox', type: 'httpHeaderAuth' },
			]);
		});
	});

	describe('syncInstanceAiFlagIntoGlobalModuleSettings', () => {
		it('preserves cloudManaged when syncing admin settings', async () => {
			setModuleSettings(settingsStore, {
				enabled: false,
				localGatewayDisabled: false,
				proxyEnabled: true,
				cloudManaged: true,
				instanceAiSetupPanelEnabled: true,
			});

			const adminResponse = {
				enabled: true,
				permissions: {},
				mcpServers: '',
				sandboxEnabled: false,
				sandboxProvider: 'n8n-sandbox',
				sandboxImage: '',
				sandboxTimeout: 60,
				daytonaCredentialId: null,
				n8nSandboxCredentialId: null,
				searchCredentialId: null,
				localGatewayDisabled: false,
			};

			mockUpdateSettings.mockResolvedValue(adminResponse);
			settingsStore.getModuleSettings = vi.fn().mockResolvedValue(undefined);

			// persistEnabled triggers syncInstanceAiFlagIntoGlobalModuleSettings
			await store.persistEnabled(true);

			const ms = settingsStore.moduleSettings['instance-ai'];
			expect(ms?.cloudManaged).toBe(true);
			expect(ms?.proxyEnabled).toBe(true);
			expect(ms?.enabled).toBe(true);
			expect(ms?.sandboxEnabled).toBe(false);
			expect(ms?.workflowBuilderAvailable).toBe(false);
			expect(ms?.sandboxUnavailableReason).toBeNull();
			expect(ms?.instanceAiSetupPanelEnabled).toBe(true);
		});
	});

	describe('unexpected disconnects', () => {
		it('distinguishes an unavailable gateway from a user-disconnected gateway', async () => {
			setModuleSettings(settingsStore, { localGatewayDisabled: false });
			setUserPreference(store, { localGatewayDisabled: false });
			mockGetGatewayStatus
				.mockResolvedValueOnce({
					connected: true,
					directory: '/tmp',
					hostIdentifier: 'host-1',
					toolCategories: [],
				})
				.mockResolvedValueOnce({
					connected: false,
					directory: null,
					hostIdentifier: null,
					toolCategories: [],
				});

			await store.fetchGatewayStatus();
			expect(store.computerUseConnectionStatus).toBe('connected');
			await store.fetchGatewayStatus();
			expect(store.computerUseConnectionStatus).toBe('disconnected');
			expect(store.gatewayHostIdentifier).toBe('host-1');

			mockDisconnectGatewaySession.mockResolvedValue(undefined);
			await store.disconnectComputerUse();
			expect(store.computerUseConnectionStatus).toBe('none');
			expect(store.gatewayHostIdentifier).toBeNull();
		});

		it('tracks Browser Use disconnects observed in the current session', async () => {
			mockGetBrowserStatus
				.mockResolvedValueOnce({ connected: true, connectedAt: '2026-01-01', toolCategories: [] })
				.mockResolvedValueOnce({ connected: false, connectedAt: null, toolCategories: [] });

			await store.fetchBrowserStatus();
			expect(store.browserUseConnectionStatus).toBe('connected');
			await store.fetchBrowserStatus();
			expect(store.browserUseConnectionStatus).toBe('disconnected');

			mockDisconnectBrowserSession.mockResolvedValue(undefined);
			await store.disconnectBrowserUse();
			expect(store.browserUseConnectionStatus).toBe('none');
		});
	});

	describe('setup command', () => {
		beforeEach(() => {
			setModuleSettings(settingsStore, {
				enabled: true,
				localGatewayDisabled: false,
				proxyEnabled: false,
				cloudManaged: false,
			});
			setUserPreference(store, { localGatewayDisabled: false });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('clears stale command state while fetching a new setup command', async () => {
			let resolveRequest: (value: {
				command: string;
				expiresAt: string;
				ttlSeconds: number;
			}) => void = () => {};
			mockCreateGatewayLink.mockReturnValue(
				new Promise((resolve) => {
					resolveRequest = resolve;
				}),
			);
			store.setupCommand = 'old command';
			store.setupCommandExpiresAt = '2026-01-01T00:00:00.000Z';
			store.setupCommandTtlSeconds = 1;
			store.setupCommandFetchedAt = 1;

			const request = store.fetchSetupCommand();

			expect(store.setupCommand).toBeNull();
			expect(store.setupCommandExpiresAt).toBeNull();
			expect(store.setupCommandTtlSeconds).toBeNull();
			expect(store.setupCommandFetchedAt).toBeNull();

			resolveRequest({
				command: 'new command',
				expiresAt: '2026-01-01T00:05:00.000Z',
				ttlSeconds: 300,
			});
			await request;

			expect(store.setupCommand).toBe('new command');
		});

		it('uses the request start time as setup command countdown baseline', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
			mockCreateGatewayLink.mockImplementation(async () => {
				vi.setSystemTime(new Date('2026-01-01T00:00:10.000Z'));
				return {
					command: 'command',
					expiresAt: '2026-01-01T00:05:00.000Z',
					ttlSeconds: 300,
				};
			});

			await store.fetchSetupCommand();

			expect(store.setupCommandFetchedAt).toBe(new Date('2026-01-01T00:00:00.000Z').getTime());
		});

		it('clears setup command state on disconnect', async () => {
			mockDisconnectGatewaySession.mockResolvedValue(undefined);
			store.setupCommand = 'old command';
			store.setupCommandExpiresAt = '2026-01-01T00:00:00.000Z';
			store.setupCommandTtlSeconds = 1;
			store.setupCommandFetchedAt = 1;

			await store.disconnectComputerUse();

			expect(store.setupCommand).toBeNull();
			expect(store.setupCommandExpiresAt).toBeNull();
			expect(store.setupCommandTtlSeconds).toBeNull();
			expect(store.setupCommandFetchedAt).toBeNull();
		});
	});
});
