import { defineStore } from 'pinia';
import { STORES, TIME } from '@/constants';
import { ref, computed } from 'vue';
import { useSettingsStore } from './settings.store';
import { useRootStore } from './n8nRoot.store';
import type { IPushData } from '../Interface';

export interface PushState {
	pushRef: string;
	pushSource: WebSocket | EventSource | null;
	reconnectTimeout: NodeJS.Timeout | null;
	retryTimeout: NodeJS.Timeout | null;
	pushMessageQueue: Array<{ event: Event; retriesLeft: number }>;
	connectRetries: number;
	lostConnection: boolean;
	outgoingQueue: unknown[];
	isConnectionOpen: boolean;
}

export type OnPushMessageHandler = (event: IPushData) => void;

/**
 * Store for managing a push connection to the server
 */
export const usePushConnectionStore = defineStore(STORES.PUSH, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const pushRef = computed(() => rootStore.pushRef);
	const pushSource = ref<WebSocket | EventSource | null>(null);
	const reconnectTimeout = ref<NodeJS.Timeout | null>(null);
	const connectRetries = ref(0);
	const lostConnection = ref(false);
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

	function onConnectionError() {
		pushDisconnect();
		connectRetries.value++;
		reconnectTimeout.value = setTimeout(
			attemptReconnect,
			Math.min(connectRetries.value * 2000, 8 * TIME.SECOND), // maximum 8 seconds backoff
		);
	}

	/**
	 * Close connection to server
	 */
	function pushDisconnect() {
		if (pushSource.value !== null) {
			pushSource.value.removeEventListener('error', onConnectionError);
			pushSource.value.removeEventListener('close', onConnectionError);
			pushSource.value.removeEventListener('message', pushMessageReceived);
			if (pushSource.value.readyState < 2) pushSource.value.close();
			pushSource.value = null;
		}

		isConnectionOpen.value = false;
	}

	/**
	 * Connect to server to receive data via a WebSocket or EventSource
	 */
	function pushConnect() {
		// always close the previous connection so that we do not end up with multiple connections
		pushDisconnect();

		if (reconnectTimeout.value) {
			clearTimeout(reconnectTimeout.value);
			reconnectTimeout.value = null;
		}

		const useWebSockets = settingsStore.pushBackend === 'websocket';

		const { getRestUrl: restUrl } = rootStore;
		const url = `/push?pushRef=${pushRef.value}`;

		if (useWebSockets) {
			const { protocol, host } = window.location;
			const baseUrl = restUrl.startsWith('http')
				? restUrl.replace(/^http/, 'ws')
				: `${protocol === 'https:' ? 'wss' : 'ws'}://${host + restUrl}`;
			pushSource.value = new WebSocket(`${baseUrl}${url}`);
		} else {
			pushSource.value = new EventSource(`${restUrl}${url}`, { withCredentials: true });
		}

		pushSource.value.addEventListener('open', onConnectionSuccess, false);
		pushSource.value.addEventListener('message', pushMessageReceived, false);
		pushSource.value.addEventListener(useWebSockets ? 'close' : 'error', onConnectionError, false);
	}

	function attemptReconnect() {
		pushConnect();
	}

	function serializeAndSend(message: unknown) {
		if (pushSource.value && 'send' in pushSource.value) {
			pushSource.value.send(JSON.stringify(message));
		}
	}

	function onConnectionSuccess() {
		isConnectionOpen.value = true;
		connectRetries.value = 0;
		lostConnection.value = false;
		rootStore.pushConnectionActive = true;
		pushSource.value?.removeEventListener('open', onConnectionSuccess);

		if (outgoingQueue.value.length) {
			for (const message of outgoingQueue.value) {
				serializeAndSend(message);
			}
			outgoingQueue.value = [];
		}
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
	async function pushMessageReceived(event: Event) {
		let receivedData: IPushData;
		try {
			// @ts-ignore
			receivedData = JSON.parse(event.data);
		} catch (error) {
			return;
		}

		onMessageReceivedHandlers.value.forEach((handler) => handler(receivedData));
	}

	return {
		pushRef,
		pushSource,
		isConnectionOpen,
		onMessageReceivedHandlers,
		addEventListener,
		pushConnect,
		pushDisconnect,
		send,
	};
});
