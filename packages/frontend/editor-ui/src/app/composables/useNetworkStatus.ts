import { onMounted, onUnmounted, ref } from 'vue';
import { useNetworkStore } from '@/app/stores/network.store';
import { useHeartbeat } from '@/app/push-connection/useHeartbeat';

const HEALTH_CHECK_INTERVAL = 30000;
const HEALTH_CHECK_TIMEOUT = 5000;

export function useNetworkStatus() {
	const networkStore = useNetworkStore();
	const checking = ref(false);
	const heartbeatRunning = ref(false);

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
			networkStore.setOnline(isConnected);
		} finally {
			checking.value = false;
		}
	}

	/**
	 * Periodic health checks to detect connectivity issues that browser events miss.
	 */
	const { startHeartbeat, stopHeartbeat } = useHeartbeat({
		interval: HEALTH_CHECK_INTERVAL,
		onHeartbeat: () => {
			void updateOnlineStatus();
		},
	});

	/**
	 * Browser offline event - fast hint that we're definitely offline.
	 * Stop health checks until we get an online event.
	 */
	const handleOffline = () => {
		networkStore.setOnline(false);
		if (heartbeatRunning.value) {
			stopHeartbeat();
			heartbeatRunning.value = false;
		}
	};

	/**
	 * Browser online event - verify with backend before marking as online.
	 * Browser events can be unreliable (e.g., WiFi connected but no internet).
	 */
	const handleOnline = async () => {
		await updateOnlineStatus();
		if (!heartbeatRunning.value) {
			startHeartbeat();
			heartbeatRunning.value = true;
		}
	};

	onMounted(() => {
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Initial health check and start polling
		void updateOnlineStatus();
		startHeartbeat();
		heartbeatRunning.value = true;
	});

	onUnmounted(() => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
		if (heartbeatRunning.value) {
			stopHeartbeat();
			heartbeatRunning.value = false;
		}
	});

	return {
		isOnline: networkStore.isOnline,
	};
}
