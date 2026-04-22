import { defineStore } from 'pinia';
import { ref, computed, reactive, toRaw } from 'vue';
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
import { createGatewayLink, getGatewayStatus } from './instanceAi.api';
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
	const isDaemonConnecting = ref(false);
	const setupCommand = ref<string | null>(null);
	const isGatewayPolling = ref(false);

	const gatewayConnected = ref(false);
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

	// ── Gateway polling ───────────────────────────────────────────────────

	let gatewayPollTimer: ReturnType<typeof setInterval> | null = null;

	function pollGatewayStatus(): void {
		if (isGatewayPolling.value) return;
		isGatewayPolling.value = true;

		// Fetch initial status immediately so UI reflects current state
		void getGatewayStatus(rootStore.restApiContext)
			.then((status) => {
				gatewayConnected.value = status.connected;
				gatewayDirectory.value = status.directory;
				gatewayHostIdentifier.value = status.hostIdentifier ?? null;
				gatewayToolCategories.value = status.toolCategories ?? [];
			})
			.catch(() => {});

		gatewayPollTimer = setInterval(async () => {
			try {
				const status = await getGatewayStatus(rootStore.restApiContext);
				const wasConnected = gatewayConnected.value;
				gatewayConnected.value = status.connected;
				gatewayDirectory.value = status.directory;
				gatewayHostIdentifier.value = status.hostIdentifier ?? null;
				gatewayToolCategories.value = status.toolCategories ?? [];
				if (!status.connected && wasConnected) {
					daemonConnectAttempted = false;
					startDaemonProbing();
				}
			} catch {
				// Silently retry
			}
		}, 3000);
	}

	function stopGatewayPolling(): void {
		if (gatewayPollTimer) {
			clearInterval(gatewayPollTimer);
			gatewayPollTimer = null;
		}
		isGatewayPolling.value = false;
	}

	// ── Auto-connect daemon ──────────────────────────────────────────────

	const DAEMON_BASE = 'http://127.0.0.1:7655';
	let daemonEventSource: EventSource | null = null;
	let daemonConnectAttempted = false;

	async function connectDaemon(): Promise<void> {
		if (isGatewayConnected.value || isDaemonConnecting.value || daemonConnectAttempted) return;
		daemonConnectAttempted = true;
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

			pollGatewayStatus();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to connect daemon';
			toast.showError(new Error(message), 'Daemon connection failed');
		} finally {
			isDaemonConnecting.value = false;
			stopDaemonProbing();
		}
	}

	function startDaemonProbing(): void {
		if (daemonEventSource || daemonConnectAttempted || isGatewayConnected.value) return;

		daemonEventSource = new EventSource(`${DAEMON_BASE}/events`);
		daemonEventSource.addEventListener('ready', () => {
			void connectDaemon();
		});
	}

	function stopDaemonProbing(): void {
		if (daemonEventSource) {
			daemonEventSource.close();
			daemonEventSource = null;
		}
	}

	// ── Gateway push listener ──────────────────────────────────────────

	let removeGatewayPushListener: (() => void) | null = null;

	function startGatewayPushListener(): void {
		if (removeGatewayPushListener) return;
		const pushStore = usePushConnectionStore();
		removeGatewayPushListener = pushStore.addEventListener((message) => {
			if (message.type !== 'instanceAiGatewayStateChanged') return;
			gatewayConnected.value = message.data.connected;
			gatewayDirectory.value = message.data.directory;
			gatewayHostIdentifier.value = message.data.hostIdentifier ?? null;
			gatewayToolCategories.value = message.data.toolCategories ?? [];
			if (!message.data.connected) {
				daemonConnectAttempted = false;
				startDaemonProbing();
			}
		});
	}

	function stopGatewayPushListener(): void {
		if (removeGatewayPushListener) {
			removeGatewayPushListener();
			removeGatewayPushListener = null;
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
		persistOptinModalDismissed,
		setField,
		setPreferenceField,
		setPermission,
		getPermission,
		reset,
		// Gateway / daemon
		isDaemonConnecting,
		setupCommand,
		isGatewayPolling,
		isGatewayConnected,
		gatewayDirectory,
		gatewayHostIdentifier,
		gatewayToolCategories,
		activeDirectory,
		isInstanceAiDisabled,
		isLocalGatewayDisabled,
		isLocalGatewayDisabledByAdmin,
		isProxyEnabled,
		isCloudManaged,
		pollGatewayStatus,
		stopGatewayPolling,
		startDaemonProbing,
		stopDaemonProbing,
		startGatewayPushListener,
		stopGatewayPushListener,
		fetchSetupCommand,
		refreshCredentials,
		refreshModuleSettings,
	};
});
