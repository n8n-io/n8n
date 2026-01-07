import { ref } from 'vue';

type UseReconnectTimerOptions = {
	/** Callback that an attempt should be made */
	onAttempt: () => void;

	/** Callback that a future attempt was scheduled */
	onAttemptScheduled: (delay: number) => void;
};

/**
 * A timer for exponential backoff reconnect attempts.
 */
export const useReconnectTimer = ({ onAttempt, onAttemptScheduled }: UseReconnectTimerOptions) => {
	const initialReconnectDelay = 1000;
	const maxReconnectDelay = 15_000;

	const reconnectTimer = ref<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttempts = ref(0);

	const scheduleReconnect = () => {
		const delay = Math.min(initialReconnectDelay * 2 ** reconnectAttempts.value, maxReconnectDelay);

		reconnectAttempts.value++;

		onAttemptScheduled(delay);
		reconnectTimer.value = setTimeout(() => {
			onAttempt();
		}, delay);
	};

	/** Stops the reconnect timer. NOTE: This does not reset the reconnect attempts. */
	const stopReconnectTimer = () => {
		if (reconnectTimer.value) {
			clearTimeout(reconnectTimer.value);
			reconnectTimer.value = null;
		}
	};

	const resetConnectionAttempts = () => {
		reconnectAttempts.value = 0;
	};

	return {
		scheduleReconnect,
		stopReconnectTimer,
		resetConnectionAttempts,
	};
};
