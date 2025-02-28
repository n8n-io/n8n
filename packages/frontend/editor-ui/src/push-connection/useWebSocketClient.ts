import { useHeartbeat } from '@/push-connection/useHeartbeat';
import { useReconnectTimer } from '@/push-connection/useReconnectTimer';
import { ref } from 'vue';
import { createHeartbeatMessage } from '@n8n/api-types';
export type UseWebSocketClientOptions<T> = {
	url: string;
	onMessage: (data: T) => void;
};

/** Defined here as not available in tests */
export const WebSocketState = {
	CONNECTING: 0,
	OPEN: 1,
	CLOSING: 2,
	CLOSED: 3,
};

/**
 * Creates a WebSocket connection to the server. Uses reconnection logic
 * to reconnect if the connection is lost.
 */
export const useWebSocketClient = <T>(options: UseWebSocketClientOptions<T>) => {
	const isConnected = ref(false);
	const socket = ref<WebSocket | null>(null);

	/**
	 * Heartbeat timer to keep the connection alive. This is an additional
	 * mechanism to the protocol level ping/pong mechanism the server sends.
	 * This is used the ensure the client notices connection issues.
	 */
	const { startHeartbeat, stopHeartbeat } = useHeartbeat({
		interval: 30_000,
		onHeartbeat: () => {
			socket.value?.send(JSON.stringify(createHeartbeatMessage()));
		},
	});

	const onConnected = () => {
		socket.value?.removeEventListener('open', onConnected);
		isConnected.value = true;
		startHeartbeat();
		reconnectTimer.resetConnectionAttempts();
	};

	const onConnectionLost = (event: CloseEvent) => {
		console.warn(`[WebSocketClient] Connection lost, code=${event.code ?? 'unknown'}`);
		disconnect();
		reconnectTimer.scheduleReconnect();
	};

	const onMessage = (event: MessageEvent) => {
		options.onMessage(event.data);
	};

	const onError = (error: unknown) => {
		console.warn('[WebSocketClient] Connection error:', error);
	};

	const disconnect = () => {
		if (socket.value) {
			stopHeartbeat();
			reconnectTimer.stopReconnectTimer();
			socket.value.removeEventListener('message', onMessage);
			socket.value.removeEventListener('error', onError);
			socket.value.removeEventListener('close', onConnectionLost);
			socket.value.close(1000);
			socket.value = null;
		}

		isConnected.value = false;
	};

	const connect = () => {
		// Ensure we disconnect any existing connection
		disconnect();

		socket.value = new WebSocket(options.url);
		socket.value.addEventListener('open', onConnected);
		socket.value.addEventListener('message', onMessage);
		socket.value.addEventListener('error', onError);
		socket.value.addEventListener('close', onConnectionLost);
	};

	const reconnectTimer = useReconnectTimer({
		onAttempt: connect,
		onAttemptScheduled: (delay) => {
			console.log(`[WebSocketClient] Attempting to reconnect in ${delay}ms`);
		},
	});

	const sendMessage = (serializedMessage: string) => {
		if (!isConnected.value || !socket.value) {
			throw new Error('Not connected to the server');
		}

		socket.value.send(serializedMessage);
	};

	return {
		isConnected,
		connect,
		disconnect,
		sendMessage,
	};
};
