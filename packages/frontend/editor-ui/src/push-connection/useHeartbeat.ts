import { ref } from 'vue';

export type UseHeartbeatOptions = {
	interval: number;
	onHeartbeat: () => void;
};

/**
 * Creates a heartbeat timer using the given interval. The timer needs
 * to be started and stopped manually.
 */
export const useHeartbeat = (options: UseHeartbeatOptions) => {
	const { interval, onHeartbeat } = options;

	const heartbeatTimer = ref<ReturnType<typeof setInterval> | null>(null);

	const startHeartbeat = () => {
		heartbeatTimer.value = setInterval(onHeartbeat, interval);
	};

	const stopHeartbeat = () => {
		if (heartbeatTimer.value) {
			clearInterval(heartbeatTimer.value);
			heartbeatTimer.value = null;
		}
	};

	return {
		startHeartbeat,
		stopHeartbeat,
	};
};
