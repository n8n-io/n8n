import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PushMessage } from '@n8n/api-types';

import { STORES } from '@/constants';
import { useSettingsStore } from './settings.store';
import { useRootStore } from './root.store';
import { WebSocketClient } from '@/push-connection/WebSocketClient';
import { EventSourceClient } from '@/push-connection/EventSourceClient';
import type { PushClientOptions } from '@/push-connection/AbstractPushClient';

export type OnPushMessageHandler = (event: PushMessage) => void;

/**
 * Store for managing a push connection to the server
 */
export const usePushConnectionStore = defineStore(STORES.PUSH, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const pushRef = computed(() => rootStore.pushRef);
	const pushConnection = ref<WebSocketClient | EventSourceClient | null>(null);
	const outgoingQueue = ref<unknown[]>([]);
	const isConnectionOpen = ref(false);

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

	/**
	 * Close connection to server
	 */
	function pushDisconnect() {
		pushConnection.value?.disconnect();

		isConnectionOpen.value = false;
	}

	function getConnectionUrl(useWebSockets: boolean) {
		const restUrl = rootStore.restUrl;
		const url = `/push?pushRef=${pushRef.value}`;

		if (useWebSockets) {
			const { protocol, host } = window.location;
			const baseUrl = restUrl.startsWith('http')
				? restUrl.replace(/^http/, 'ws')
				: `${protocol === 'https:' ? 'wss' : 'ws'}://${host + restUrl}`;
			return `${baseUrl}${url}`;
		} else {
			return `${restUrl}${url}`;
		}
	}

	/**
	 * Connect to server to receive data via a WebSocket or EventSource
	 */
	function pushConnect() {
		// always close the previous connection so that we do not end up with multiple connections
		pushDisconnect();

		const useWebSockets = settingsStore.pushBackend === 'websocket';
		const url = getConnectionUrl(useWebSockets);

		const opts: PushClientOptions = {
			url,
			callbacks: {
				onMessage: pushMessageReceived,
				onConnect,
				onDisconnect,
			},
		};

		pushConnection.value = useWebSockets ? new WebSocketClient(opts) : new EventSourceClient(opts);
		pushConnection.value.connect();
	}

	function serializeAndSend(message: unknown) {
		pushConnection.value?.sendMessage(JSON.stringify(message));
	}

	function onConnect() {
		isConnectionOpen.value = true;
		rootStore.setPushConnectionActive();

		if (outgoingQueue.value.length) {
			for (const message of outgoingQueue.value) {
				serializeAndSend(message);
			}
			outgoingQueue.value = [];
		}
	}

	function onDisconnect() {
		isConnectionOpen.value = false;
		rootStore.setPushConnectionInactive();
	}

	function send(message: unknown) {
		if (!isConnectionOpen.value) {
			outgoingQueue.value.push(message);
			return;
		}
		serializeAndSend(message);
	}

	/**
	 * Process a newly received message
	 */
	async function pushMessageReceived(data: unknown) {
		let receivedData: PushMessage;
		try {
			receivedData = JSON.parse(data as string);
		} catch (error) {
			return;
		}

		onMessageReceivedHandlers.value.forEach((handler) => handler(receivedData));
	}

	const clearQueue = () => {
		outgoingQueue.value = [];
	};

	return {
		pushRef,
		pushSource: pushConnection,
		isConnectionOpen,
		onMessageReceivedHandlers,
		addEventListener,
		pushConnect,
		pushDisconnect,
		send,
		clearQueue,
	};
});
