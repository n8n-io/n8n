import { defineStore } from 'pinia';
import { ref, computed, reactive, toRaw, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useToast } from '@/app/composables/useToast';
import {
	fetchSettings,
	updateSettings,
	fetchPreferences,
	updatePreferences,
	fetchModelCredentials,
	fetchServiceCredentials,
} from './instanceAi.settings.api';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { createGatewayLink, disconnectGatewaySession, getGatewayStatus } from './instanceAi.api';
import type {
	FrontendModuleSettings,
	InstanceAiAdminSettingsResponse,
	InstanceAiAdminSettingsUpdateRequest,
	InstanceAiUserPreferencesResponse,
	InstanceAiUserPreferencesUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
	InstanceAiPermissionMode,
	ToolCategory,
} from '@n8n/api-types';
import { i18n } from '@n8n/i18n';

export const useInstanceAiSettingsStore = defineStore('instanceAiSettings', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();

	const isLoading = ref(false);
	const isSaving = ref(false);
	const settings = ref<InstanceAiAdminSettingsResponse | null>(null);
	const preferences = ref<InstanceAiUserPreferencesResponse | null>(null);
	const credentials = ref<InstanceAiModelCredential[]>([]);
	const serviceCredentials = ref<InstanceAiModelCredential[]>([]);
	const draft = reactive<InstanceAiAdminSettingsUpdateRequest>({});
	const preferencesDraft = reactive<InstanceAiUserPreferencesUpdateRequest>({});

	// ── Gateway / daemon state ──────────────────────────────────────────
	const HAS_CONNECTED_STORAGE_KEY = 'instanceAi.gateway.hasConnected';
	const isDaemonConnecting = ref(false);
	const setupCommand = ref<string | null>(null);

	const hasEverConnectedGateway = ref(
		typeof localStorage !== 'undefined' &&
			localStorage.getItem(HAS_CONNECTED_STORAGE_KEY) === 'true',
	);

	function markGatewayEverConnected(): void {
		if (hasEverConnectedGateway.value) return;
		hasEverConnectedGateway.value = true;
		try {
			localStorage.setItem(HAS_CONNECTED_STORAGE_KEY, 'true');
		} catch {}
	}

	function clearGatewayEverConnected(): void {
		hasEverConnectedGateway.value = false;
		try {
			localStorage.removeItem(HAS_CONNECTED_STORAGE_KEY);
		} catch {}
	}

	const gatewayConnected = ref(false);
	const gatewayStatusLoaded = ref(false);
	const gatewayDirectory = ref<string | null>(null);
	const gatewayHostIdentifier = ref<string | null>(null);
	const gatewayToolCategories = ref<ToolCategory[]>([]);
	const isGatewayConnected = computed(() => gatewayConnected.value);
	const activeDirectory = computed(() => gatewayDirectory.value);
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
	const isProxyEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.proxyEnabled === true,
	);
	const isCloudManaged = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.cloudManaged === true,
	);

	const isDirty = computed(() => {
		if (!settings.value && !preferences.value) return false;
		return Object.keys(draft).length > 0 || Object.keys(preferencesDraft).length > 0;
	});

	function syncInstanceAiFlagIntoGlobalModuleSettings(
		adminRes: InstanceAiAdminSettingsResponse,
	): void {
		const ms = settingsStore.moduleSettings;
		const prev = ms['instance-ai'];
		const merged: NonNullable<FrontendModuleSettings['instance-ai']> = {
			enabled: adminRes.enabled,
			localGatewayDisabled: adminRes.localGatewayDisabled ?? prev?.localGatewayDisabled ?? false,
			proxyEnabled: prev?.proxyEnabled ?? false,
			optinModalDismissed: adminRes.optinModalDismissed,
			cloudManaged: prev?.cloudManaged ?? false,
		};
		settingsStore.moduleSettings = {
			...ms,
			'instance-ai': merged,
		};
	}
	const canManage = computed(() =>
		hasPermission(['rbac'], { rbac: { scope: 'instanceAi:manage' } }),
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
			if (!isProxyEnabled.value) {
				const credPromises: [
					Promise<InstanceAiModelCredential[]>,
					Promise<InstanceAiModelCredential[]>,
				] = [
					fetchModelCredentials(rootStore.restApiContext),
					canManage.value ? fetchServiceCredentials(rootStore.restApiContext) : Promise.resolve([]),
				];
				const [c, sc] = await Promise.all(credPromises);
				credentials.value = c;
				serviceCredentials.value = sc;
			}
			clearDraft();
		} catch {
			toast.showError(new Error('Failed to load settings'), 'Settings error');
		} finally {
			isLoading.value = false;
		}
	}

	async function save(): Promise<void> {
		isSaving.value = true;
		try {
			const hasAdminChanges = Object.keys(draft).length > 0;
			const hasPreferenceChanges = Object.keys(preferencesDraft).length > 0;

			const [adminResult, prefsResult] = await Promise.allSettled([
				hasAdminChanges
					? updateSettings(rootStore.restApiContext, {
							...toRaw(draft),
						} as InstanceAiAdminSettingsUpdateRequest)
					: Promise.resolve(settings.value),
				hasPreferenceChanges
					? updatePreferences(rootStore.restApiContext, preferencesDraft)
					: Promise.resolve(preferences.value),
			]);

			if (adminResult.status === 'fulfilled' && adminResult.value)
				settings.value = adminResult.value;
			if (prefsResult.status === 'fulfilled' && prefsResult.value)
				preferences.value = prefsResult.value;

			const failed = [adminResult, prefsResult].filter((r) => r.status === 'rejected');
			if (failed.length > 0) {
				throw (failed[0] as PromiseRejectedResult).reason;
			}

			clearDraft();
			toast.showMessage({ title: 'Settings saved', type: 'success' });
			if (hasAdminChanges) {
				await settingsStore.getModuleSettings();
				const adminSaved =
					adminResult.status === 'fulfilled' && adminResult.value ? adminResult.value : null;
				if (adminSaved) {
					syncInstanceAiFlagIntoGlobalModuleSettings(adminSaved);
				}
			}
		} catch {
			toast.showError(new Error('Failed to save settings'), 'Settings error');
		} finally {
			isSaving.value = false;
		}
	}

	async function persistOptinModalDismissed(): Promise<void> {
		try {
			const result = await updateSettings(rootStore.restApiContext, {
				optinModalDismissed: true,
			});
			settings.value = result;
			syncInstanceAiFlagIntoGlobalModuleSettings(result);
		} catch (error) {}
	}

	/** Persists only the Instance AI on/off flag (does not send other admin draft fields). */
	async function persistEnabled(value: boolean): Promise<void> {
		isSaving.value = true;
		try {
			const result = await updateSettings(rootStore.restApiContext, { enabled: value });
			settings.value = result;
			delete draft.enabled;
			await settingsStore.getModuleSettings();
			syncInstanceAiFlagIntoGlobalModuleSettings(result);
			toast.showMessage({ title: 'Settings saved', type: 'success' });
		} catch {
			toast.showError(new Error('Failed to save settings'), 'Settings error');
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
			toast.showError(new Error('Failed to save preference'), 'Settings error');
		}
	}

	async function ensurePreferencesLoaded(): Promise<void> {
		if (preferences.value) return;
		try {
			preferences.value = await fetchPreferences(rootStore.restApiContext);
		} catch {}
	}

	// ── Sidebar connections ──────────────────────────────────────────────
	type ConnectionStatus = 'connected' | 'waiting' | 'disconnected';

	interface SidebarConnection {
		type: 'computer-use' | 'browser-use';
		name: string;
		subtitle: string;
		status: ConnectionStatus;
	}

	const hasBrowserCategory = computed(() =>
		gatewayToolCategories.value.some((c) => c.name === 'browser'),
	);

	const isBrowserUseConnected = computed(
		() => gatewayToolCategories.value.find((c) => c.name === 'browser')?.enabled === true,
	);

	const connections = computed<SidebarConnection[]>(() => {
		const result: SidebarConnection[] = [];

		if (!isLocalGatewayDisabled.value) {
			result.push({
				type: 'computer-use',
				name: gatewayDirectory.value ?? i18n.baseText('instanceAi.connections.add.computerUse'),
				subtitle: gatewayConnected.value
					? i18n.baseText('instanceAi.connections.types.computerUse.subtitle')
					: i18n.baseText('instanceAi.connections.row.status.disconnected'),
				status: gatewayConnected.value ? 'connected' : 'disconnected',
			});
		}

		if (gatewayConnected.value && hasBrowserCategory.value) {
			result.push({
				type: 'browser-use',
				name: 'Google Chrome',
				subtitle: i18n.baseText('instanceAi.connections.types.browserUse.subtitle'),
				status: isBrowserUseConnected.value ? 'connected' : 'disconnected',
			});
		}

		return result;
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
		clearGatewayEverConnected();
		gatewayConnected.value = false;
		gatewayToolCategories.value = [];
		gatewayDirectory.value = null;
		gatewayHostIdentifier.value = null;
	}

	/** Destructive: disables the user preference and removes the row from the list. */
	async function removeComputerUse(): Promise<void> {
		await disconnectComputerUse();
		await persistLocalGatewayPreference(true);
	}

	function setField<K extends keyof InstanceAiAdminSettingsUpdateRequest>(
		key: K,
		value: InstanceAiAdminSettingsUpdateRequest[K],
	): void {
		draft[key] = value;
	}

	function setPreferenceField<K extends keyof InstanceAiUserPreferencesUpdateRequest>(
		key: K,
		value: InstanceAiUserPreferencesUpdateRequest[K],
	): void {
		preferencesDraft[key] = value;
	}

	function clearDraft(): void {
		for (const key of Object.keys(draft)) {
			delete (draft as Record<string, unknown>)[key];
		}
		for (const key of Object.keys(preferencesDraft)) {
			delete (preferencesDraft as Record<string, unknown>)[key];
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

	function reset(): void {
		clearDraft();
	}

	// ── Gateway status fetch ──────────────────────────────────────────────

	async function fetchGatewayStatus(): Promise<void> {
		try {
			const status = await getGatewayStatus(rootStore.restApiContext);
			gatewayConnected.value = status.connected;
			gatewayDirectory.value = status.directory;
			gatewayHostIdentifier.value = status.hostIdentifier ?? null;
			gatewayToolCategories.value = status.toolCategories ?? [];
			if (status.connected) markGatewayEverConnected();
		} catch {
		} finally {
			gatewayStatusLoaded.value = true;
		}
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
			if (message.type !== 'instanceAiGatewayStateChanged') return;
			gatewayConnected.value = message.data.connected;
			gatewayDirectory.value = message.data.directory;
			gatewayHostIdentifier.value = message.data.hostIdentifier ?? null;
			gatewayToolCategories.value = message.data.toolCategories ?? [];
			if (message.data.connected) {
				markGatewayEverConnected();
			}
		});

		stopPushReconnectWatch = watch(
			() => pushStore.isConnected,
			(now, prev) => {
				if (now && !prev) void fetchGatewayStatus();
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

	async function fetchSetupCommand(): Promise<void> {
		if (isLocalGatewayDisabled.value) return;
		try {
			const result = await createGatewayLink(rootStore.restApiContext);
			setupCommand.value = result.command;
		} catch {
			// Fallback handled in the component
		}
	}

	async function refreshCredentials(): Promise<void> {
		if (isProxyEnabled.value) return;
		try {
			const [c, sc] = await Promise.all([
				fetchModelCredentials(rootStore.restApiContext),
				fetchServiceCredentials(rootStore.restApiContext),
			]);
			credentials.value = c;
			serviceCredentials.value = sc;
		} catch {
			// Silently fail — credentials list will refresh on next full fetch
		}
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

	return {
		canManage,
		settings,
		preferences,
		credentials,
		serviceCredentials,
		draft,
		preferencesDraft,
		isLoading,
		isSaving,
		isDirty,
		fetch,
		save,
		persistEnabled,
		persistLocalGatewayPreference,
		persistOptinModalDismissed,
		ensurePreferencesLoaded,
		setField,
		setPreferenceField,
		setPermission,
		getPermission,
		reset,
		// Gateway / daemon
		isDaemonConnecting,
		setupCommand,
		hasEverConnectedGateway,
		isGatewayConnected,
		gatewayStatusLoaded,
		gatewayDirectory,
		gatewayHostIdentifier,
		gatewayToolCategories,
		activeDirectory,
		isInstanceAiDisabled,
		isLocalGatewayDisabled,
		isLocalGatewayDisabledByAdmin,
		isProxyEnabled,
		fetchGatewayStatus,
		connectLocalGateway,
		isCloudManaged,
		startGatewayPushListener,
		stopGatewayPushListener,
		fetchSetupCommand,
		refreshCredentials,
		refreshModuleSettings,
		// Sidebar connections
		connections,
		isBrowserUseConnected,
		disconnectComputerUse,
		removeComputerUse,
	};
});
