import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@n8n/stores';
import { DEBOUNCE_TIME, getDebounceTime } from '@/app/constants/durations';
import { useSettingsStore } from './settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWebSocketClient } from '@/app/push-connection/useWebSocketClient';
import { useEventSourceClient } from '@/app/push-connection/useEventSourceClient';

export type OnPushMessageHandler = (event: PushMessage) => void;

/**
 * Store for managing a push connection to the server
 */
export const usePushConnectionStore = defineStore(STORES.PUSH, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	/**
	 * Queue of messages to be sent to the server. Messages are queued if
	 * the connection is down.
	 */
	const outgoingQueue = ref<unknown[]>([]);

	/** Whether the connection has been requested */
	const isConnectionRequested = ref(false);

	const onMessageReceivedHandlers = ref<OnPushMessageHandler[]>([]);

	const addEventListener = (handler: OnPushMessageHandler) => {
		onMessageReceivedHandlers.value.push(handler);

		return () => {
			const index = onMessageReceivedHandlers.value.indexOf(handler);
			if (index !== -1) {
				onMessageReceivedHandlers.value.splice(index, 1);
			}
		};
	};

	const useWebSockets = computed(() => settingsStore.pushBackend === 'websocket');

	const getConnectionUrl = () => {
		const restUrl = rootStore.restUrl;
		const url = `/push?pushRef=${rootStore.pushRef}`;

		if (useWebSockets.value) {
			const { protocol, host } = window.location;
			const baseUrl = restUrl.startsWith('http')
				? restUrl.replace(/^http/, 'ws')
				: `${protocol === 'https:' ? 'wss' : 'ws'}://${host + restUrl}`;
			return `${baseUrl}${url}`;
		} else {
			return `${restUrl}${url}`;
		}
	};

	/**
	 * Process a newly received message
	 */
	async function onMessage(data: unknown) {
		// The `nodeExecuteAfterData` message is sent as binary data
		// to be handled by a web worker in the future.
		if (data instanceof ArrayBuffer) {
			data = new TextDecoder('utf-8').decode(new Uint8Array(data));
		}

		let parsedData: PushMessage;
		try {
			parsedData = JSON.parse(data as string);
		} catch (error) {
			return;
		}

		onMessageReceivedHandlers.value.forEach((handler) => handler(parsedData));
	}

	const url = getConnectionUrl();

	const client = computed(() =>
		useWebSockets.value
			? useWebSocketClient({ url, onMessage })
			: useEventSourceClient({ url, onMessage }),
	);

	function serializeAndSend(message: unknown) {
		if (client.value.isConnected.value) {
			client.value.sendMessage(JSON.stringify(message));
		} else {
			outgoingQueue.value.push(message);
		}
	}

	/**
	 * Debounce window in ms for disconnect. If pushConnect is called within this
	 * window (before or after pushDisconnect), the connection is kept.
	 */
	const getDisconnectDebounceMs = () =>
		getDebounceTime(DEBOUNCE_TIME.CONNECTION.WEBSOCKET_DISCONNECT);

	/**
	 * Tracks whether a connect was recently requested. Used to handle race conditions
	 * during route transitions where disconnect/connect may be called in quick succession.
	 * Connect always wins within the debounce window.
	 */
	let recentConnectIntent = false;

	/**
	 * Timeout to reset recentConnectIntent after the debounce window.
	 */
	let connectIntentTimeout: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Timeout for debounced disconnect.
	 */
	let disconnectTimeout: ReturnType<typeof setTimeout> | null = null;

	const pushConnect = () => {
		recentConnectIntent = true;

		// Reset recentConnectIntent after debounce window
		if (connectIntentTimeout) {
			clearTimeout(connectIntentTimeout);
		}
		connectIntentTimeout = setTimeout(() => {
			recentConnectIntent = false;
			connectIntentTimeout = null;
		}, getDisconnectDebounceMs());

		// Cancel any pending disconnect timeout
		if (disconnectTimeout) {
			clearTimeout(disconnectTimeout);
			disconnectTimeout = null;
		}

		isConnectionRequested.value = true;
		client.value.connect();
	};

	const pushDisconnect = () => {
		// If connect was called recently, don't disconnect
		// (handles race condition where new view mounts before old view unmounts)
		if (recentConnectIntent) {
			return;
		}

		// Cancel any existing timeout and schedule a new one
		if (disconnectTimeout) {
			clearTimeout(disconnectTimeout);
		}

		disconnectTimeout = setTimeout(() => {
			// Double-check in case connect was called while we were waiting
			if (recentConnectIntent) {
				disconnectTimeout = null;
				return;
			}
			isConnectionRequested.value = false;
			client.value.disconnect();
			disconnectTimeout = null;
		}, getDisconnectDebounceMs());
	};

	watch(
		() => client.value.isConnected.value,
		(didConnect) => {
			if (!didConnect) {
				return;
			}

			// Send any buffered messages
			if (outgoingQueue.value.length) {
				for (const message of outgoingQueue.value) {
					serializeAndSend(message);
				}
				outgoingQueue.value = [];
			}
		},
	);

	/** Removes all buffered messages from the sent queue */
	const clearQueue = () => {
		outgoingQueue.value = [];
	};

	const isConnected = computed(() => client.value.isConnected.value);

	return {
		isConnected,
		isConnectionRequested,
		onMessageReceivedHandlers,
		addEventListener,
		pushConnect,
		pushDisconnect,
		send: serializeAndSend,
		clearQueue,
	};
});
