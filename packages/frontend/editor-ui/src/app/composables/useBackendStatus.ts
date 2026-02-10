import { onMounted, onUnmounted, ref } from 'vue';
import { useBackendConnectionStore } from '@/app/stores/backendConnection.store';
import { useHeartbeat } from '@/app/push-connection/useHeartbeat';

const HEALTH_CHECK_INTERVAL = 10000;
const HEALTH_CHECK_TIMEOUT = 5000;

export function useBackendStatus() {
	const backendConnectionStore = useBackendConnectionStore();
	const checking = ref(false);

	/**
	 * Check backend connectivity by pinging the health endpoint.
	 */
	async function checkBackendConnection(): Promise<boolean> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

		try {
			const response = await fetch('/healthz', {
				cache: 'no-store',
				signal: controller.signal,
			});
			return response.ok;
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
