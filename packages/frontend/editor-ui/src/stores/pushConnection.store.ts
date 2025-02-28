import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@/constants';
import { useSettingsStore } from './settings.store';
import { useRootStore } from './root.store';
import { useWebSocketClient } from '@/push-connection/useWebSocketClient';
import { useEventSourceClient } from '@/push-connection/useEventSourceClient';

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

	const useWebSockets = settingsStore.pushBackend === 'websocket';

	const getConnectionUrl = () => {
		const restUrl = rootStore.restUrl;
		const url = `/push?pushRef=${rootStore.pushRef}`;

		if (useWebSockets) {
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
		let receivedData: PushMessage;
		try {
			receivedData = JSON.parse(data as string);
		} catch (error) {
			return;
		}

		onMessageReceivedHandlers.value.forEach((handler) => handler(receivedData));
	}

	const url = getConnectionUrl();

	const client = useWebSockets
		? useWebSocketClient({ url, onMessage })
		: useEventSourceClient({ url, onMessage });

	function serializeAndSend(message: unknown) {
		if (client.isConnected.value) {
			client.sendMessage(JSON.stringify(message));
		} else {
			outgoingQueue.value.push(message);
		}
	}

	const pushConnect = () => {
		isConnectionRequested.value = true;
		client.connect();
	};

	const pushDisconnect = () => {
		isConnectionRequested.value = false;
		client.disconnect();
	};

	watch(client.isConnected, (didConnect) => {
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
	});

	/** Removes all buffered messages from the sent queue */
	const clearQueue = () => {
		outgoingQueue.value = [];
	};

	const isConnected = computed(() => client.isConnected.value);

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
