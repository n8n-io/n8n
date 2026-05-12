import { onBeforeUnmount, ref } from 'vue';

import type { CloudAgentEvent } from './cloudAgent.types';

/**
 * Lightweight composable that opens an EventSource against a cloud-agent
 * /cloud-agent/events/:threadId URL, parses canonical events, and invokes
 * the supplied callback for each. Supports reconnect with `Last-Event-ID`
 * via EventSource's native behaviour.
 *
 * Doesn't manage thread state itself — that's the store's job. Returns
 * connection state and a close() function.
 */
export interface CloudAgentEventSourceHandle {
	close: () => void;
	connectionState: ReturnType<typeof ref<'idle' | 'connecting' | 'open' | 'closed'>>;
}

export function useCloudAgentEventSource(
	url: string,
	onEvent: (event: CloudAgentEvent) => void,
	onError?: (error: Event) => void,
): CloudAgentEventSourceHandle {
	const connectionState = ref<'idle' | 'connecting' | 'open' | 'closed'>('connecting');

	const es = new EventSource(url, { withCredentials: true });

	es.onopen = () => {
		connectionState.value = 'open';
	};

	es.onmessage = (e: MessageEvent<string>) => {
		try {
			const event = JSON.parse(e.data) as CloudAgentEvent;
			onEvent(event);
		} catch {
			// drop malformed frames
		}
	};

	es.onerror = (e) => {
		if (onError) onError(e);
		// EventSource will auto-reconnect for transient errors; we only flip
		// to 'closed' once readyState is CLOSED.
		if (es.readyState === EventSource.CLOSED) {
			connectionState.value = 'closed';
		}
	};

	const close = () => {
		es.close();
		connectionState.value = 'closed';
	};

	onBeforeUnmount(close);

	return { close, connectionState };
}
