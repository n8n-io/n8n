import { onMounted, onUnmounted } from 'vue';
import { useNetworkStore } from '@/app/stores/network.store';

export function useNetworkStatus() {
	const networkStore = useNetworkStore();

	const handleOnline = () => {
		networkStore.setOnline(true);
	};

	const handleOffline = () => {
		networkStore.setOnline(false);
	};

	onMounted(() => {
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
	});

	onUnmounted(() => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	});

	return {
		isOnline: networkStore.isOnline,
	};
}
