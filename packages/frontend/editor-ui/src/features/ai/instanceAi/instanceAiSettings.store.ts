import { defineStore } from 'pinia';
import { ref, computed, reactive, toRaw, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useToast } from '@n8n/composables/useToast';
import {
	fetchSettings,
	updateSettings,
	fetchPreferences,
	updatePreferences,
	fetchServiceCredentials,
	fetchInstanceModelCredentials,
	fetchModelCatalog,
	verifyModel as verifyModelRequest,
	verifySandbox as verifySandboxRequest,
	verifySearch as verifySearchRequest,
} from './instanceAi.settings.api';
import { hasPermission } from '@/app/utils/rbac/permissions';
import {
	createBrowserLink,
	createGatewayLink,
	disconnectBrowserSession,
	disconnectGatewaySession,
	getBrowserStatus,
	getGatewayStatus,
} from './instanceAi.api';
import type {
	FrontendModuleSettings,
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiProviderConnection,
	InstanceAiPermissions,
	InstanceAiPermissionMode,
	InstanceAiModelCatalogResponse,
	ToolCategory,
	InstanceAiVerifyModelRequest,
	InstanceAiVerifySandboxRequest,
	InstanceAiVerifySearchRequest,
	InstanceAiVerificationResponse,
} from '@n8n/api-types';
import { i18n } from '@n8n/i18n';
import type { ToolConnectionStatus } from '@/features/shared/toolsConnection/types';
import { deriveInstanceAiConfiguration } from './instanceAiConfiguration';

export const useInstanceAiSettingsStore = defineStore('instanceAiSettings', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();

	const isLoading = ref(false);
	const isSaving = ref(false);
	const settings = ref<InstanceAiAdminSettingsResponse | null>(null);
	const preferences = ref<InstanceAiUserPreferencesResponse | null>(null);
	const serviceCredentials = ref<InstanceAiProviderConnection[]>([]);
	const instanceModelCredentials = ref<InstanceAiProviderConnection[]>([]);
	const modelCatalog = ref<InstanceAiModelCatalogResponse['models'] | null>(null);
	const isModelCatalogLoading = ref(false);
	let modelCatalogFetchPromise: Promise<void> | null = null;
	const draft = reactive<InstanceAiAdminSettingsUpdateRequest>({});

	// ── Gateway / daemon state ──────────────────────────────────────────
	const isDaemonConnecting = ref(false);
	const setupCommand = ref<string | null>(null);
	const setupCommandExpiresAt = ref<string | null>(null);
	const setupCommandTtlSeconds = ref<number | null>(null);
	const setupCommandFetchedAt = ref<number | null>(null);
	let setupCommandRequestId = 0;
	const hasObservedGatewayConnection = ref(false);
	const hasObservedBrowserConnection = ref(false);

	const gatewayConnected = ref(false);
	const gatewayDirectory = ref<string | null>(null);
	const gatewayHostIdentifier = ref<string | null>(null);
	const gatewayToolCategories = ref<ToolCategory[]>([]);
	const isGatewayConnected = computed(() => gatewayConnected.value);

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
	const isLocalGatewayDisabledByAdmin = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.localGatewayDisabled !== false,
	);
	/** Whether the local gateway is effectively disabled (admin override OR user preference). */
	const isLocalGatewayDisabled = computed(
		() => isLocalGatewayDisabledByAdmin.value || preferences.value?.localGatewayDisabled === true,
	);
	const isBrowserUseEnabledByAdmin = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.browserUseEnabled === true,
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
	/**
	 * Setup panel v2 gate — the single FE accessor; the backing mechanism (env var
	 * today) stays swappable. Named with the instanceAi prefix because the canvas
	 * Focus sidebar has its own unrelated `isSetupPanelEnabled` (setupPanel store).
	 */
	const isInstanceAiSetupPanelEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.instanceAiSetupPanelEnabled === true,
	);

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
			localGatewayDisabled: adminRes.localGatewayDisabled ?? prev?.localGatewayDisabled ?? false,
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
			instanceAiSetupPanelEnabled: prev?.instanceAiSetupPanelEnabled ?? false,
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

	async function fetch(): Promise<void> {
		isLoading.value = true;
		try {
			const promises: [
				Promise<InstanceAiAdminSettingsResponse | null>,
				Promise<InstanceAiUserPreferencesResponse>,
			] = [
				canManage.value ? fetchSettings(rootStore.restApiContext) : Promise.resolve(null),
				fetchPreferences(rootStore.restApiContext),
			];
			const [s, p] = await Promise.all(promises);
			settings.value = s;
			preferences.value = p;
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
		} catch {
			toast.showError(
				new Error(i18n.baseText('settings.n8nAgent.toast.loadError')),
				i18n.baseText('settings.n8nAgent.toast.errorTitle'),
			);
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

	async function persistLocalGatewayPreference(disabled: boolean): Promise<void> {
		try {
			const result = await updatePreferences(rootStore.restApiContext, {
				localGatewayDisabled: disabled,
			});
			preferences.value = result;
		} catch {
			toast.showError(
				new Error(i18n.baseText('settings.n8nAgent.toast.preferenceError')),
				i18n.baseText('settings.n8nAgent.toast.errorTitle'),
			);
		}
	}

	async function persistChatPanelWidthRatio(chatPanelWidthRatio: number): Promise<void> {
		if (preferences.value) {
			preferences.value = { ...preferences.value, chatPanelWidthRatio };
		}
		try {
			const result = await updatePreferences(rootStore.restApiContext, {
				chatPanelWidthRatio,
			});
			preferences.value = result;
		} catch {}
	}

	async function ensurePreferencesLoaded(): Promise<void> {
		if (preferences.value) return;
		try {
			preferences.value = await fetchPreferences(rootStore.restApiContext);
		} catch {}
	}

	const isGatewayBrowserCategoryEnabled = computed(
		() => gatewayToolCategories.value.find((c) => c.name === 'browser')?.enabled === true,
	);

	/** Connected through either channel: direct extension session or daemon browser category. */
	const isBrowserUseConnected = computed(
		() =>
			browserConnected.value || (gatewayConnected.value && isGatewayBrowserCategoryEnabled.value),
	);
	const computerUseConnectionStatus = computed<ToolConnectionStatus>(() => {
		if (gatewayConnected.value) return 'connected';
		if (isDaemonConnecting.value) return 'connecting';
		if (hasObservedGatewayConnection.value && !isLocalGatewayDisabled.value) return 'disconnected';
		return 'none';
	});
	const browserUseConnectionStatus = computed<ToolConnectionStatus>(() => {
		if (browserConnected.value) return 'connected';
		return hasObservedBrowserConnection.value ? 'disconnected' : 'none';
	});
	/**
	 * Tears down the paired gateway session on the server (so its tools are no
	 * longer exposed to the agent). User preference stays enabled — the user
	 * can re-pair via the setup modal.
	 */
	async function disconnectComputerUse(): Promise<void> {
		try {
			await disconnectGatewaySession(rootStore.restApiContext);
		} catch {
			toast.showError(
				new Error(i18n.baseText('instanceAi.connections.disconnectError.message')),
				i18n.baseText('instanceAi.connections.disconnectError.title'),
			);
			return;
		}
		clearSetupCommand();
		hasObservedGatewayConnection.value = false;
		gatewayConnected.value = false;
		gatewayToolCategories.value = [];
		gatewayDirectory.value = null;
		gatewayHostIdentifier.value = null;
	}

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
		return settings.value?.permissions?.[key] ?? 'require_approval';
	}

	// ── Gateway status fetch ──────────────────────────────────────────────

	async function fetchGatewayStatus(): Promise<void> {
		try {
			const status = await getGatewayStatus(rootStore.restApiContext);
			gatewayConnected.value = status.connected;
			gatewayToolCategories.value = status.toolCategories ?? [];
			if (status.connected) {
				hasObservedGatewayConnection.value = true;
				gatewayDirectory.value = status.directory;
				gatewayHostIdentifier.value = status.hostIdentifier ?? null;
			}
		} catch {}
	}

	// ── Browser Use (direct channel) ──────────────────────────────────────

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

	// ── Connect to local daemon ──────────────────────────────────────────
	// The daemon is only contacted in response to an explicit user action.
	// Once paired, the backend keeps the connection alive on its own.

	const DAEMON_BASE = 'http://127.0.0.1:7655';

	/**
	 * User-initiated pairing with a running `@n8n/computer-use` daemon.
	 * Returns true on success, false on failure (a toast is shown on failure).
	 */
	async function connectLocalGateway(): Promise<boolean> {
		if (isGatewayConnected.value || isDaemonConnecting.value) return isGatewayConnected.value;
		isDaemonConnecting.value = true;
		try {
			const result = await createGatewayLink(rootStore.restApiContext);

			let baseUrl = rootStore.restApiContext.baseUrl.replace(/\/rest$/, '');
			if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
				baseUrl = `${window.location.protocol}//${window.location.host}${baseUrl}`;
			}
			const res = await globalThis.fetch(`${DAEMON_BASE}/connect`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					url: baseUrl,
					token: result.token,
				}),
			});

			if (!res.ok) {
				const body = (await res.json()) as { error?: string };
				throw new Error(body.error ?? 'Daemon connection failed');
			}

			void fetchGatewayStatus();
			return true;
		} catch {
			toast.showError(
				new Error(
					'Could not reach the local daemon. Make sure `npx @n8n/computer-use` is running.',
				),
				'Connection failed',
			);
			return false;
		} finally {
			isDaemonConnecting.value = false;
		}
	}

	// ── Gateway push listener ──────────────────────────────────────────

	let removeGatewayPushListener: (() => void) | null = null;
	let stopPushReconnectWatch: (() => void) | null = null;

	function startGatewayPushListener(): void {
		if (removeGatewayPushListener) return;
		const pushStore = usePushConnectionStore();
		removeGatewayPushListener = pushStore.addEventListener((message) => {
			if (message.type === 'instanceAiGatewayStateChanged') {
				gatewayConnected.value = message.data.connected;
				gatewayToolCategories.value = message.data.toolCategories ?? [];
				if (message.data.connected) {
					hasObservedGatewayConnection.value = true;
					gatewayDirectory.value = message.data.directory;
					gatewayHostIdentifier.value = message.data.hostIdentifier ?? null;
				}
				return;
			}
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
					void fetchGatewayStatus();
					void fetchBrowserStatus();
				}
			},
		);
	}

	function stopGatewayPushListener(): void {
		if (removeGatewayPushListener) {
			removeGatewayPushListener();
			removeGatewayPushListener = null;
		}
		if (stopPushReconnectWatch) {
			stopPushReconnectWatch();
			stopPushReconnectWatch = null;
		}
	}

	function clearSetupCommand(): void {
		setupCommandRequestId++;
		setupCommand.value = null;
		setupCommandExpiresAt.value = null;
		setupCommandTtlSeconds.value = null;
		setupCommandFetchedAt.value = null;
	}

	async function fetchSetupCommand(): Promise<void> {
		const requestId = ++setupCommandRequestId;
		setupCommand.value = null;
		setupCommandExpiresAt.value = null;
		setupCommandTtlSeconds.value = null;
		setupCommandFetchedAt.value = null;
		if (isLocalGatewayDisabled.value) return;
		const requestStartedAt = Date.now();
		try {
			const result = await createGatewayLink(rootStore.restApiContext);
			if (requestId !== setupCommandRequestId) return;
			setupCommand.value = result.command;
			setupCommandExpiresAt.value = result.expiresAt;
			setupCommandTtlSeconds.value = result.ttlSeconds;
			setupCommandFetchedAt.value = requestStartedAt;
		} catch {
			// Fallback handled in the component
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
		const promises: Array<Promise<unknown>> = [settingsStore.getModuleSettings()];
		if (!preferences.value) {
			promises.push(
				fetchPreferences(rootStore.restApiContext).then((p) => {
					preferences.value = p;
				}),
			);
		}
		await Promise.all(promises);
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
		preferences,
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
		persistLocalGatewayPreference,
		persistChatPanelWidthRatio,
		ensurePreferencesLoaded,
		setField,
		setPermission,
		getPermission,
		// Gateway / daemon
		isDaemonConnecting,
		setupCommand,
		setupCommandExpiresAt,
		setupCommandTtlSeconds,
		setupCommandFetchedAt,
		computerUseConnectionStatus,
		isGatewayConnected,
		gatewayDirectory,
		gatewayHostIdentifier,
		gatewayToolCategories,
		isInstanceAiDisabled,
		isLocalGatewayDisabled,
		isLocalGatewayDisabledByAdmin,
		isBrowserUseEnabledByAdmin,
		isProxyEnabled,
		isSandboxEnabled,
		isWorkflowBuilderAvailable,
		isInstanceAiSetupPanelEnabled,
		fetchGatewayStatus,
		connectLocalGateway,
		isCloudManaged,
		startGatewayPushListener,
		stopGatewayPushListener,
		fetchSetupCommand,
		clearSetupCommand,
		refreshCredentials,
		refreshInstanceModelCredentials,
		loadModelCatalog,
		refreshModuleSettings,
		verifyModel,
		verifySandbox,
		verifySearch,
		// Browser Use (direct channel)
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
		isBrowserUseConnected,
		disconnectComputerUse,
	};
});
