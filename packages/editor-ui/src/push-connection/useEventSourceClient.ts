import { useReconnectTimer } from '@/push-connection/useReconnectTimer';
import { ref } from 'vue';

export type UseEventSourceClientOptions = {
	url: string;
	onMessage: (data: string) => void;
};

/**
 * Creates an EventSource connection to the server. Uses reconnection logic
 * to reconnect if the connection is lost.
 */
export const useEventSourceClient = (options: UseEventSourceClientOptions) => {
	const isConnected = ref(false);
	const eventSource = ref<EventSource | null>(null);

	const onConnected = () => {
		isConnected.value = true;
		reconnectTimer.resetConnectionAttempts();
	};

	const onConnectionLost = () => {
		console.warn('[EventSourceClient] Connection lost');
		isConnected.value = false;
		reconnectTimer.scheduleReconnect();
	};

	const onMessage = (event: MessageEvent) => {
		options.onMessage(event.data);
	};

	const disconnect = () => {
		if (eventSource.value) {
			reconnectTimer.stopReconnectTimer();
			eventSource.value.close();
			eventSource.value = null;
		}

		isConnected.value = false;
	};

	const connect = () => {
		// Ensure we disconnect any existing connection
		disconnect();

		eventSource.value = new EventSource(options.url, { withCredentials: true });
		eventSource.value.addEventListener('open', onConnected);
		eventSource.value.addEventListener('message', onMessage);
		eventSource.value.addEventListener('close', onConnectionLost);
	};

	const reconnectTimer = useReconnectTimer({
		onAttempt: connect,
		onAttemptScheduled: (delay) => {
			console.log(`[EventSourceClient] Attempting to reconnect in ${delay}ms`);
		},
	});

	const sendMessage = (_: string) => {
		// Noop, EventSource does not support sending messages
	};

	return {
		isConnected,
		connect,
		disconnect,
		sendMessage,
	};
};
