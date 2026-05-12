import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { postCancel, postChat, eventsUrl } from './cloudAgent.api';
import { applyEvent } from './cloudAgent.reducer';
import type { CloudAgentEvent, CloudAgentMessage } from './cloudAgent.types';
import { useCloudAgentEventSource } from './useCloudAgentEventSource';

const STORE_ID = 'cloudAgent';

/**
 * Pinia store for the cloud-agent chat. v1 keeps state in-memory only:
 * thread/message state lives in ai-assistant-service Redis (per the design
 * doc); the n8n side caches nothing across page reloads.
 */
export const useCloudAgentStore = defineStore(STORE_ID, () => {
	const rootStore = useRootStore();

	const threadId = ref<string>(generateThreadId());
	const messages = ref<CloudAgentMessage[]>([]);
	const activeRunId = ref<string | undefined>(undefined);
	const connectionState = ref<'idle' | 'connecting' | 'open' | 'closed'>('idle');

	let eventSourceClose: (() => void) | undefined;

	const isRunning = computed(() => activeRunId.value !== undefined);

	async function sendMessage(text: string): Promise<void> {
		if (isRunning.value) return;

		messages.value = [
			...messages.value,
			{ id: cryptoRandomId(), role: 'user', content: text, createdAt: Date.now() },
		];

		const { runId } = await postChat(rootStore.restApiContext, threadId.value, text);
		activeRunId.value = runId;

		ensureEventStream();
	}

	function ensureEventStream(): void {
		if (eventSourceClose) return; // already subscribed
		connectionState.value = 'connecting';
		const handle = useCloudAgentEventSource(
			eventsUrl(rootStore.restApiContext, threadId.value),
			handleEvent,
		);
		eventSourceClose = handle.close;
		// Mirror handle.connectionState back into the store.
		// `handle.connectionState` is the same ref structure — track it.
		const interval = setInterval(() => {
			connectionState.value = handle.connectionState.value ?? 'idle';
			if (connectionState.value === 'closed') clearInterval(interval);
		}, 250);
	}

	function handleEvent(event: CloudAgentEvent): void {
		messages.value = applyEvent(messages.value, event);
		if (event.type === 'run-finish' || event.type === 'run-error') {
			activeRunId.value = undefined;
		}
	}

	async function cancel(): Promise<void> {
		if (!activeRunId.value) return;
		await postCancel(rootStore.restApiContext, activeRunId.value);
	}

	function resetThread(): void {
		eventSourceClose?.();
		eventSourceClose = undefined;
		threadId.value = generateThreadId();
		messages.value = [];
		activeRunId.value = undefined;
		connectionState.value = 'idle';
	}

	return {
		threadId,
		messages,
		activeRunId,
		isRunning,
		connectionState,
		sendMessage,
		cancel,
		resetThread,
	};
});

function generateThreadId(): string {
	return `thread-${cryptoRandomId()}`;
}

function cryptoRandomId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
