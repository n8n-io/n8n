import { onMounted, onUnmounted, ref } from 'vue';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useHeartbeat } from '@/app/push-connection/useHeartbeat';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';

const HEALTH_CHECK_INTERVAL = 10000;
const HEALTH_CHECK_TIMEOUT = 5000;

export function useBackendStatus() {
	const backendConnectionStore = useBackendConnectionStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();
	const checking = ref(false);

	/**
	 * Check backend connectivity by pinging the health endpoint.
	 */
	async function checkBackendConnection(): Promise<boolean> {
		if (!settingsStore.endpointHealth) {
			return true;
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

		// When baseUrl is a full URL (e.g. http://localhost:5678/ in dev mode),
		// extract the origin so the health request targets the backend directly.
		// When baseUrl is a relative path (e.g. /), the request goes to the current host.
		const base = rootStore.baseUrl;
		const origin = base.startsWith('http') ? new URL(base).origin : '';
		const healthUrl = origin + settingsStore.endpointHealth;

		try {
			const response = await fetch(healthUrl, {
				cache: 'no-store',
				signal: controller.signal,
			});
			if (!response.ok) return false;
			const data = (await response.json()) as { status: string };
			return data.status === 'ok';
		} catch {
			return false;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	async function updateOnlineStatus() {
		if (checking.value) return;
		checking.value = true;
		try {
			const isConnected = await checkBackendConnection();
			backendConnectionStore.setOnline(isConnected);
		} finally {
			checking.value = false;
		}
	}

	/**
	 * Periodic health checks to detect connectivity issues.
	 * This approach works reliably for both localhost and production environments,
	 * avoiding issues with unreliable browser online/offline events.
	 */
	const { startHeartbeat, stopHeartbeat } = useHeartbeat({
		interval: HEALTH_CHECK_INTERVAL,
		onHeartbeat: () => {
			void updateOnlineStatus();
		},
	});

	onMounted(() => {
		if (settingsStore.isPreviewMode) {
			return;
		}

		// Initial health check and start polling
		void updateOnlineStatus();
		startHeartbeat();
	});

	onUnmounted(() => {
		stopHeartbeat();
	});

	return {
		isOnline: backendConnectionStore.isOnline,
	};
}
