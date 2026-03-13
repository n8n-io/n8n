import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/app/stores/settings.store';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { useToast } from '@/app/composables/useToast';
import { fetchSettings, updateSettings, fetchModelCredentials } from './instanceAi.settings.api';
import { createGatewayLink, getGatewayStatus } from './instanceAi.api';
import type {
	InstanceAiSettingsResponse,
	InstanceAiSettingsUpdateRequest,
	InstanceAiModelCredential,
	InstanceAiPermissions,
	InstanceAiPermissionMode,
} from '@n8n/api-types';

export const useInstanceAiSettingsStore = defineStore('instanceAiSettings', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const toast = useToast();

	const isLoading = ref(false);
	const isSaving = ref(false);
	const settings = ref<InstanceAiSettingsResponse | null>(null);
	const credentials = ref<InstanceAiModelCredential[]>([]);
	const draft = reactive<InstanceAiSettingsUpdateRequest>({});

	// ── Gateway / daemon state ──────────────────────────────────────────
	const isDaemonConnecting = ref(false);
	const setupCommand = ref<string | null>(null);
	const isGatewayPolling = ref(false);

	const isLocalFilesystemEnabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.filesystem === true,
	);
	const isGatewayConnected = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.gatewayConnected === true,
	);
	const gatewayDirectory = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.gatewayDirectory ?? null,
	);
	const filesystemDirectory = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.filesystemDirectory ?? null,
	);
	const activeDirectory = computed(() => gatewayDirectory.value ?? filesystemDirectory.value);
	const isFilesystemDisabled = computed(
		() => settingsStore.moduleSettings?.['instance-ai']?.filesystemDisabled === true,
	);

	const isDirty = computed(() => {
		if (!settings.value) return false;
		return Object.keys(draft).length > 0;
	});

	async function fetch(): Promise<void> {
		isLoading.value = true;
		try {
			const [s, c] = await Promise.all([
				fetchSettings(rootStore.restApiContext),
				fetchModelCredentials(rootStore.restApiContext),
			]);
			settings.value = s;
			credentials.value = c;
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
			settings.value = await updateSettings(rootStore.restApiContext, draft);
			clearDraft();
			toast.showMessage({ title: 'Settings saved', type: 'success' });
		} catch {
			toast.showError(new Error('Failed to save settings'), 'Settings error');
		} finally {
			isSaving.value = false;
		}
	}

	function setField<K extends keyof InstanceAiSettingsUpdateRequest>(
		key: K,
		value: InstanceAiSettingsUpdateRequest[K],
	): void {
		draft[key] = value;
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

	function reset(): void {
		clearDraft();
	}

	// ── Gateway polling ───────────────────────────────────────────────────

	let gatewayPollTimer: ReturnType<typeof setInterval> | null = null;

	function pollGatewayStatus(): void {
		if (isGatewayPolling.value) return;
		isGatewayPolling.value = true;

		gatewayPollTimer = setInterval(async () => {
			try {
				const status = await getGatewayStatus(rootStore.restApiContext);
				const wasConnected = isGatewayConnected.value;
				if (status.connected !== wasConnected) {
					await settingsStore.getModuleSettings();
				}
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
		stopDaemonProbing();
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
			void settingsStore.getModuleSettings();
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
		try {
			const result = await createGatewayLink(rootStore.restApiContext);
			setupCommand.value = result.command;
		} catch {
			// Fallback handled in the component
		}
	}

	async function refreshModuleSettings(): Promise<void> {
		await settingsStore.getModuleSettings();
	}

	return {
		settings,
		credentials,
		draft,
		isLoading,
		isSaving,
		isDirty,
		fetch,
		save,
		setField,
		setPermission,
		getPermission,
		reset,
		// Gateway / daemon
		isDaemonConnecting,
		setupCommand,
		isGatewayPolling,
		isLocalFilesystemEnabled,
		isGatewayConnected,
		gatewayDirectory,
		filesystemDirectory,
		activeDirectory,
		isFilesystemDisabled,
		pollGatewayStatus,
		stopGatewayPolling,
		startDaemonProbing,
		stopDaemonProbing,
		startGatewayPushListener,
		stopGatewayPushListener,
		fetchSetupCommand,
		refreshModuleSettings,
	};
});
