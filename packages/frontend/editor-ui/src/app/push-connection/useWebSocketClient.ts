import { useHeartbeat } from '@/app/push-connection/useHeartbeat';
import { useReconnectTimer } from '@/app/push-connection/useReconnectTimer';
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
} as const;

export type WebSocketStateType = 0 | 1 | 2 | 3;

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

	/**
	 * Close codes that indicate a transient/proxy-level disconnect rather than
	 * a fatal error.  For these we skip the full teardown (which removes all
	 * listeners and explicitly closes the socket) and just schedule a
	 * reconnect so the next attempt can succeed without UI flicker.
	 *
	 * - 1001: Going Away — server/proxy shutting down gracefully
	 * - 1005: No Status Received — common with reverse-proxy session resets
	 * - 1006: Abnormal Closure — TCP drop, no close frame
	 */
	const TRANSIENT_CLOSE_CODES = new Set([1001, 1005, 1006]);

	const onConnectionLost = (event: CloseEvent) => {
		const code = event.code ?? 0;
		if (TRANSIENT_CLOSE_CODES.has(code)) {
			console.info(
				`[WebSocketClient] Transient close (code=${code}), scheduling reconnect`,
			);
			// Clean up the dead socket without a full disconnect cycle so the
			// reconnect timer can immediately open a fresh connection.
			stopHeartbeat();
			if (socket.value) {
				socket.value.removeEventListener('message', onMessage);
				socket.value.removeEventListener('error', onError);
				socket.value.removeEventListener('close', onConnectionLost);
				socket.value = null;
			}
			isConnected.value = false;
			reconnectTimer.scheduleReconnect();
		} else {
			console.warn(`[WebSocketClient] Connection lost, code=${code}`);
			disconnect();
			reconnectTimer.scheduleReconnect();
		}
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
		socket.value.binaryType = 'arraybuffer';
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
