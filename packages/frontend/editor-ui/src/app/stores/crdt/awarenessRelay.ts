import { decodeMessage, encodeMessage, SYNC_AWARENESS } from '@n8n/crdt';
import type { Unsubscribe, WebSocketTransport } from '@n8n/crdt';

/**
 * Transports ephemeral awareness (presence/cursors) between peers, separately
 * from the persistent document sync. Local mode relays over a BroadcastChannel
 * (cross-tab); server mode multiplexes awareness frames over the shared CRDT
 * WebSocket so presence is shared across browsers and users.
 */
export interface AwarenessRelay {
	/** Broadcast a local awareness update to peers. */
	send(update: Uint8Array): void;
	/** Subscribe to peers' awareness updates. */
	onReceive(handler: (update: Uint8Array) => void): Unsubscribe;
	/**
	 * Fires when the relay (re)connects, so the consumer can re-announce its
	 * current presence to peers that missed it.
	 */
	onReady(handler: () => void): Unsubscribe;
	/** Tear down subscriptions held by the relay. */
	destroy(): void;
}

/**
 * Awareness relay backed by the document's CRDT WebSocket transport. Awareness
 * frames ({@link SYNC_AWARENESS}) are multiplexed alongside the document-sync
 * frames the sync provider handles; each side ignores the other's frame types.
 */
export function createWebSocketAwarenessRelay(transport: WebSocketTransport): AwarenessRelay {
	return {
		send(update) {
			if (transport.connected) {
				transport.send(encodeMessage(SYNC_AWARENESS, update));
			}
		},
		onReceive(handler) {
			return transport.onReceive((data) => {
				const { messageType, payload } = decodeMessage(data);
				if (messageType === SYNC_AWARENESS) handler(payload);
			});
		},
		onReady(handler) {
			return transport.onConnectionChange((connected) => {
				if (connected) handler();
			});
		},
		destroy() {
			// The transport itself is owned and torn down by the sync provider.
		},
	};
}
