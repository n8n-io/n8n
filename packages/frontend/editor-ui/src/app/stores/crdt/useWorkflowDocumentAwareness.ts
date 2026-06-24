import { onScopeDispose, shallowRef } from 'vue';
import { ChangeOrigin } from '@n8n/crdt';
import type { AwarenessClientId, AwarenessState, CRDTDoc, Unsubscribe } from '@n8n/crdt';
import type { AwarenessRelay } from './awarenessRelay';

export interface WorkflowAwarenessUser {
	id: string;
	name: string;
	/** Display color for this user's cursor/selection. */
	color: string;
}

/** Ephemeral presence broadcast for a workflow document. */
export type WorkflowAwarenessState = {
	user: WorkflowAwarenessUser;
	/** Canvas cursor position, in flow coordinates. */
	cursor?: { x: number; y: number };
	/** Ids of nodes the user currently has selected. */
	selectedNodeIds?: string[];
} & AwarenessState;

export interface WorkflowDocumentAwarenessDeps {
	doc: CRDTDoc;
	localUser: WorkflowAwarenessUser;
	/**
	 * Server-backed relay for presence. When provided (server mode), presence is
	 * shared across browsers and users over this relay; otherwise it stays
	 * cross-tab only via a dedicated BroadcastChannel.
	 */
	relay?: AwarenessRelay | null;
}

/**
 * Layers ephemeral presence (cursors, selection) on a workflow CRDT document.
 *
 * Awareness is separate from the persistent document and is NOT carried by the
 * document sync provider, so this relays awareness updates over a dedicated
 * cross-tab BroadcastChannel keyed off the doc id. Presence complements the
 * existing collaboration store (active-user list + write lock) rather than
 * replacing it.
 *
 * Lifecycle is tied to the consuming component's scope: on dispose it marks the
 * local client offline and closes the channel. The doc itself owns final
 * awareness teardown via `doc.destroy()`.
 */
export function useWorkflowDocumentAwareness(deps: WorkflowDocumentAwarenessDeps) {
	const awareness = deps.doc.getAwareness<WorkflowAwarenessState>();
	awareness.setLocalState({ user: deps.localUser });

	// Reactive snapshot of remote presence (local client excluded).
	const remoteStates = shallowRef<Map<AwarenessClientId, WorkflowAwarenessState>>(new Map());

	function refreshRemoteStates() {
		const states = new Map(awareness.getStates());
		states.delete(awareness.clientId);
		remoteStates.value = states;
	}

	const unsubscribeChange = awareness.onChange(refreshRemoteStates);
	refreshRemoteStates();

	// Only our OWN presence is broadcast. Applying a peer's update also fires
	// onUpdate (origin 'remote'); re-broadcasting it would echo back and forth.
	// Both transports deliver every peer the originator's update directly.
	function broadcastLocalUpdate(update: Uint8Array, origin: ChangeOrigin) {
		if (origin !== ChangeOrigin.local) return;
		if (deps.relay) deps.relay.send(update);
		else channel?.postMessage(Array.from(update));
	}

	let channel: BroadcastChannel | null = null;
	let unsubscribeUpdate: Unsubscribe | null = null;
	let unsubscribeRelayReceive: Unsubscribe | null = null;
	let unsubscribeRelayReady: Unsubscribe | null = null;

	if (deps.relay) {
		// Server mode: relay presence over the shared CRDT socket.
		const relay = deps.relay;
		unsubscribeUpdate = awareness.onUpdate(broadcastLocalUpdate);
		unsubscribeRelayReceive = relay.onReceive((update) => awareness.applyUpdate(update));
		// Re-announce our presence whenever the socket (re)connects, since peers
		// that join later miss our earlier announcements. Re-setting local state
		// bumps our awareness clock, so peers (and a still-warm server room) that
		// still hold our pre-reconnect clock accept the re-announce immediately —
		// a same-clock update would otherwise be ignored and our cursor would stay
		// invisible until our next move. `onUpdate` then broadcasts it.
		unsubscribeRelayReady = relay.onReady(() => {
			const localState = awareness.getLocalState();
			if (localState) awareness.setLocalState(localState);
		});
		// Announce immediately in case the socket is already connected.
		relay.send(awareness.encodeState([awareness.clientId]));
	} else if (typeof BroadcastChannel !== 'undefined') {
		// Local mode: cross-tab awareness relay (separate channel from doc sync).
		channel = new BroadcastChannel(`${deps.doc.id}:awareness`);
		unsubscribeUpdate = awareness.onUpdate(broadcastLocalUpdate);
		channel.onmessage = (event: MessageEvent) => {
			awareness.applyUpdate(new Uint8Array(event.data as number[]));
		};
	}

	function setCursor(cursor: { x: number; y: number } | undefined) {
		awareness.setLocalStateField('cursor', cursor);
	}

	function setSelectedNodeIds(selectedNodeIds: string[]) {
		awareness.setLocalStateField('selectedNodeIds', selectedNodeIds);
	}

	function destroy() {
		// Mark this client offline first, while the relay/channel is still live, so
		// peers drop our cursor immediately rather than after the presence timeout.
		awareness.setLocalState(null);
		unsubscribeChange();
		unsubscribeUpdate?.();
		unsubscribeRelayReceive?.();
		unsubscribeRelayReady?.();
		channel?.close();
		channel = null;
	}

	onScopeDispose(destroy);

	return { remoteStates, setCursor, setSelectedNodeIds, destroy };
}
