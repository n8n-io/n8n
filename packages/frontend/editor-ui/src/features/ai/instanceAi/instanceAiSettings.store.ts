import { defineStore } from 'pinia';
import { ref, computed, reactive, toRaw, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useToast } from '@n8n/composables/useToast';
import {
	fetchSettings,
	updateSettings,
	fetchServiceCredentials,
	fetchInstanceModelCredentials,
	fetchModelCatalog,
	verifyModel as verifyModelRequest,
	verifySandbox as verifySandboxRequest,
	verifySearch as verifySearchRequest,
} from './instanceAi.settings.api';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { createBrowserLink, disconnectBrowserSession, getBrowserStatus } from './instanceAi.api';
import {
	DEFAULT_INSTANCE_AI_PERMISSIONS,
	type FrontendModuleSettings,
	type InstanceAiAdminSettingsResponse,
	type InstanceAiAdminSettingsUpdateRequest,
	type InstanceAiProviderConnection,
	type InstanceAiPermissions,
	type InstanceAiPermissionMode,
	type InstanceAiModelCatalogResponse,
	type ToolCategory,
	type InstanceAiVerifyModelRequest,
	type InstanceAiVerifySandboxRequest,
	type InstanceAiVerifySearchRequest,
	type InstanceAiVerificationResponse,
} from '@n8n/api-types';
import { i18n } from '@n8n/i18n';
import type { ToolConnectionStatus } from '@/features/shared/toolsConnection/types';
import { deriveInstanceAiConfiguration } from './instanceAiConfiguration';
import { isBrowserUseSupportedOnDevice } from './utils/browserUseSupport';
import { useInstanceAiSetupPanelExperiment } from '@/experiments/instanceAiSetupPanel/useInstanceAiSetupPanelExperiment';

export const useInstanceAiSettingsStore = defineStore('instanceAiSettings', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();

	const isLoading = ref(false);
	const isSaving = ref(false);
	const settings = ref<InstanceAiAdminSettingsResponse | null>(null);
	const serviceCredentials = ref<InstanceAiProviderConnection[]>([]);
	const instanceModelCredentials = ref<InstanceAiProviderConnection[]>([]);
	const modelCatalog = ref<InstanceAiModelCatalogResponse['models'] | null>(null);
	const isModelCatalogLoading = ref(false);
	let modelCatalogFetchPromise: Promise<void> | null = null;
	const draft = reactive<InstanceAiAdminSettingsUpdateRequest>({});

	const hasObservedBrowserConnection = ref(false);

	const browserConnected = ref(false);
	const browserConnectedAt = ref<string | null>(null);
	const browserToolCategories = ref<ToolCategory[]>([]);
	const browserStatusLoaded = ref(false);
	const browserConnectUrl = ref<string | null>(null);
	const browserConnectUrlExpiresAt = ref<string | null>(null);
	let browserConnectUrlRequestId = 0;
	const isInstanceAiDisabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.enabled !== true,
	);
	const isBrowserUseEnabledByAdmin = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.browserUseEnabled === true,
	);
	const isMcpAvailable = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.mcpConnectionsAvailable === true,
	);

	const isBrowserUseAvailable = computed(
		() => isBrowserUseSupportedOnDevice() && isBrowserUseEnabledByAdmin.value,
	);
	const isProxyEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.proxyEnabled === true,
	);
	const isCloudManaged = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.cloudManaged === true,
	);
	const isSandboxEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.sandboxEnabled === true,
	);
	const isWorkflowBuilderAvailable = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.workflowBuilderAvailable ?? true,
	);
	const { isEnabled: isInstanceAiSetupPanelEnabled } = useInstanceAiSetupPanelExperiment();

	function syncInstanceAiFlagIntoGlobalModuleSettings(
		adminRes: InstanceAiAdminSettingsResponse,
	): void {
		const ms = settingsStore.moduleSettings;
		const prev = ms['instance-ai'];
		const configuration = deriveInstanceAiConfiguration(
			adminRes,
			instanceModelCredentials.value,
			serviceCredentials.value,
		);
		const merged: NonNullable<FrontendModuleSettings['instance-ai']> = {
			enabled: adminRes.enabled,
			mcpConnectionsAvailable:
				adminRes.mcpAccessEnabled && (prev?.mcpConnectionsAvailable ?? false),
			browserUseEnabled: adminRes.browserUseEnabled ?? prev?.browserUseEnabled ?? true,
			proxyEnabled: prev?.proxyEnabled ?? false,
			cloudManaged: prev?.cloudManaged ?? false,
			setupCompleted: configuration.setupCompleted,
			sandboxEnabled: adminRes.sandboxEnabled,
			workflowBuilderAvailable: adminRes.sandboxEnabled
				? (prev?.workflowBuilderAvailable ?? true)
				: false,
			sandboxUnavailableReason: adminRes.sandboxEnabled
				? (prev?.sandboxUnavailableReason ?? null)
				: null,
			runDebugEnabled: prev?.runDebugEnabled ?? false,
			workflowSuggestionsEnabled: prev?.workflowSuggestionsEnabled ?? false,
		};
		settingsStore.moduleSettings = {
			...ms,
			'instance-ai': merged,
		};
	}
	const canManage = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'instanceAi:manage' } }),
	);
	const canManageAiUsage = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'aiAssistant:manage' } }),
	);
	const canManageInstanceCredentials = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'credential:manageInstance' } }),
	);

	async function fetch(): Promise<boolean> {
		isLoading.value = true;
		try {
			settings.value = canManage.value ? await fetchSettings(rootStore.restApiContext) : null;
			if (!isCloudManaged.value && canManage.value) {
				const [sc, imc] = await Promise.all([
					fetchServiceCredentials(rootStore.restApiContext),
					isProxyEnabled.value
						? Promise.resolve([])
						: fetchInstanceModelCredentials(rootStore.restApiContext),
				]);
				serviceCredentials.value = sc;
				instanceModelCredentials.value = imc;
			}
			clearDraft();
			return true;
		} catch {
			toast.showError(
				new Error(i18n.baseText('settings.n8nAgent.toast.loadError')),
				i18n.baseText('settings.n8nAgent.toast.errorTitle'),
			);
			return false;
		} finally {
			isLoading.value = false;
		}
	}

	/**
	 * Persists the staged admin draft. Returns whether the save succeeded; on
	 * failure the draft is discarded so a later unrelated save can't flush it.
	 */
	async function save(showToast = true): Promise<boolean> {
		if (Object.keys(draft).length === 0) return true;
		isSaving.value = true;
		try {
			const result = await updateSettings(rootStore.restApiContext, {
				...toRaw(draft),
			} as InstanceAiAdminSettingsUpdateRequest);
			settings.value = result;
			clearDraft();
			if (showToast) {
				toast.showMessage({
					title: i18n.baseText('settings.n8nAgent.toast.saved'),
					type: 'success',
				});
			}
			syncInstanceAiFlagIntoGlobalModuleSettings(result);
			await settingsStore.getModuleSettings().catch(() => {});
			return true;
		} catch (error) {
			clearDraft();
			toast.showError(error, i18n.baseText('settings.n8nAgent.toast.errorTitle'));
			return false;
		} finally {
			isSaving.value = false;
		}
	}

	/** Persists only the Instance AI on/off flag (does not send other admin draft fields). */
	async function persistEnabled(value: boolean, showToast = true): Promise<boolean> {
		isSaving.value = true;
		try {
			const result = await updateSettings(rootStore.restApiContext, { enabled: value });
			settings.value = result;
			delete draft.enabled;
			syncInstanceAiFlagIntoGlobalModuleSettings(result);
			await settingsStore.getModuleSettings().catch(() => {});
			if (showToast) {
				toast.showMessage({
					title: i18n.baseText('settings.n8nAgent.toast.saved'),
					type: 'success',
				});
			}
			return true;
		} catch {
			toast.showError(
				new Error(i18n.baseText('settings.n8nAgent.toast.saveError')),
				i18n.baseText('settings.n8nAgent.toast.errorTitle'),
			);
			return false;
		} finally {
			isSaving.value = false;
		}
	}

	const browserUseConnectionStatus = computed<ToolConnectionStatus>(() => {
		if (browserConnected.value) return 'connected';
		return hasObservedBrowserConnection.value ? 'disconnected' : 'none';
	});

	function setField<K extends keyof InstanceAiAdminSettingsUpdateRequest>(
		key: K,
		value: InstanceAiAdminSettingsUpdateRequest[K],
	): void {
		if (value === undefined) delete draft[key];
		else draft[key] = value;
	}

	function clearDraft(): void {
		for (const key of Object.keys(draft)) {
			delete (draft as Record<string, unknown>)[key];
		}
	}

	function setPermission(key: keyof InstanceAiPermissions, value: InstanceAiPermissionMode): void {
		const existing = draft.permissions ?? {};
		draft.permissions = { ...existing, [key]: value };
	}

	function getPermission(key: keyof InstanceAiPermissions): InstanceAiPermissionMode {
		const draftVal = draft.permissions?.[key];
		if (draftVal !== undefined) return draftVal;
		// A key the server did not send falls back to its own default, not to
		// `require_approval`: not every permission defaults to approval.
		return settings.value?.permissions?.[key] ?? DEFAULT_INSTANCE_AI_PERMISSIONS[key];
	}

	// ── Browser Use ────────────────────────────────────────────────────────

	async function fetchBrowserStatus(): Promise<void> {
		try {
			const status = await getBrowserStatus(rootStore.restApiContext);
			browserConnected.value = status.connected;
			browserConnectedAt.value = status.connectedAt;
			browserToolCategories.value = status.toolCategories ?? [];
			if (status.connected) hasObservedBrowserConnection.value = true;
		} catch {
		} finally {
			browserStatusLoaded.value = true;
		}
	}

	function clearBrowserConnectUrl(): void {
		browserConnectUrlRequestId++;
		browserConnectUrl.value = null;
		browserConnectUrlExpiresAt.value = null;
	}

	/**
	 * Fetch a fresh opaque extension connect URL from the server. The URL is
	 * stored (not displayed) so the setup modal can open it on user click.
	 */
	async function fetchBrowserConnectUrl(): Promise<string | null> {
		const requestId = ++browserConnectUrlRequestId;
		try {
			const result = await createBrowserLink(rootStore.restApiContext);
			if (requestId !== browserConnectUrlRequestId) return null;
			browserConnectUrl.value = result.connectUrl;
			browserConnectUrlExpiresAt.value = result.expiresAt;
			return result.connectUrl;
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.browserUse.connectLinkError.message')),
				i18n.baseText('instanceAi.browserUse.connectLinkError.title'),
			);
			return null;
		}
	}

	/** Tears down the direct browser session on the server. */
	async function disconnectBrowserUse(): Promise<void> {
		try {
			await disconnectBrowserSession(rootStore.restApiContext);
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.browserUse.disconnectError.message')),
				i18n.baseText('instanceAi.browserUse.disconnectError.title'),
			);
			return;
		}
		clearBrowserConnectUrl();
		hasObservedBrowserConnection.value = false;
		browserConnected.value = false;
		browserConnectedAt.value = null;
		browserToolCategories.value = [];
	}

	// ── Browser push listener ────────────────────────────────────────────

	let removeBrowserPushListener: (() => void) | null = null;
	let stopPushReconnectWatch: (() => void) | null = null;

	function startBrowserPushListener(): void {
		if (removeBrowserPushListener) return;
		const pushStore = usePushConnectionStore();
		removeBrowserPushListener = pushStore.addEventListener((message) => {
			if (message.type === 'instanceAiBrowserStateChanged') {
				browserConnected.value = message.data.connected;
				browserConnectedAt.value = message.data.connectedAt;
				browserToolCategories.value = message.data.toolCategories ?? [];
				if (message.data.connected) hasObservedBrowserConnection.value = true;
			}
		});

		stopPushReconnectWatch = watch(
			() => pushStore.isConnected,
			(now, prev) => {
				if (now && !prev) {
					void fetchBrowserStatus();
				}
			},
		);
	}

	function stopBrowserPushListener(): void {
		if (removeBrowserPushListener) {
			removeBrowserPushListener();
			removeBrowserPushListener = null;
		}
		if (stopPushReconnectWatch) {
			stopPushReconnectWatch();
			stopPushReconnectWatch = null;
		}
	}

	async function refreshCredentials(): Promise<void> {
		if (isCloudManaged.value) return;
		try {
			serviceCredentials.value = await fetchServiceCredentials(rootStore.restApiContext);
		} catch {
			// Silently fail — credentials list will refresh on next full fetch
		}
	}

	async function refreshInstanceModelCredentials(): Promise<void> {
		if (isProxyEnabled.value || !canManage.value) return;
		try {
			instanceModelCredentials.value = await fetchInstanceModelCredentials(
				rootStore.restApiContext,
			);
		} catch {}
	}

	async function loadModelCatalog(): Promise<void> {
		if (modelCatalog.value) return;
		if (modelCatalogFetchPromise) return await modelCatalogFetchPromise;

		isModelCatalogLoading.value = true;
		const request = fetchModelCatalog(rootStore.restApiContext)
			.then((response) => {
				if (Object.values(response.models).some((models) => models.length > 0)) {
					modelCatalog.value = response.models;
				}
			})
			.catch(() => {})
			.finally(() => {
				isModelCatalogLoading.value = false;
				modelCatalogFetchPromise = null;
			});
		modelCatalogFetchPromise = request;

		await request;
	}

	async function refreshModuleSettings(): Promise<void> {
		await settingsStore.getModuleSettings();
	}

	async function verifyModel(
		payload: InstanceAiVerifyModelRequest,
	): Promise<InstanceAiVerificationResponse> {
		return await verifyModelRequest(rootStore.restApiContext, payload);
	}

	async function verifySandbox(
		payload: InstanceAiVerifySandboxRequest,
	): Promise<InstanceAiVerificationResponse> {
		return await verifySandboxRequest(rootStore.restApiContext, payload);
	}

	async function verifySearch(
		payload: InstanceAiVerifySearchRequest,
	): Promise<InstanceAiVerificationResponse> {
		return await verifySearchRequest(rootStore.restApiContext, payload);
	}

	return {
		canManage,
		canManageAiUsage,
		canManageInstanceCredentials,
		settings,
		serviceCredentials,
		instanceModelCredentials,
		modelCatalog,
		draft,
		isLoading,
		isSaving,
		isModelCatalogLoading,
		fetch,
		save,
		persistEnabled,
		setField,
		setPermission,
		getPermission,
		isInstanceAiDisabled,
		isMcpAvailable,
		isBrowserUseAvailable,
		isBrowserUseEnabledByAdmin,
		isProxyEnabled,
		isSandboxEnabled,
		isWorkflowBuilderAvailable,
		isInstanceAiSetupPanelEnabled,
		isCloudManaged,
		startBrowserPushListener,
		stopBrowserPushListener,
		refreshCredentials,
		refreshInstanceModelCredentials,
		loadModelCatalog,
		refreshModuleSettings,
		verifyModel,
		verifySandbox,
		verifySearch,
		// Browser Use
		browserConnected,
		browserUseConnectionStatus,
		browserConnectedAt,
		browserToolCategories,
		browserStatusLoaded,
		browserConnectUrl,
		browserConnectUrlExpiresAt,
		fetchBrowserStatus,
		fetchBrowserConnectUrl,
		clearBrowserConnectUrl,
		disconnectBrowserUse,
	};
});
