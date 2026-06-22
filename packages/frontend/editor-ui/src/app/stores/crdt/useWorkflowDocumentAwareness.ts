import { onScopeDispose, shallowRef } from 'vue';
import { ChangeOrigin } from '@n8n/crdt';
import type { AwarenessClientId, AwarenessState, CRDTDoc, Unsubscribe } from '@n8n/crdt';

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

	// Cross-tab awareness relay (separate channel from the document sync).
	let channel: BroadcastChannel | null = null;
	let unsubscribeUpdate: Unsubscribe | null = null;
	if (typeof BroadcastChannel !== 'undefined') {
		channel = new BroadcastChannel(`${deps.doc.id}:awareness`);
		unsubscribeUpdate = awareness.onUpdate((update, origin) => {
			// Only broadcast our OWN presence. Applying a peer's update also fires
			// onUpdate (origin 'remote'); re-broadcasting it would echo back and
			// forth across tabs. Mesh delivery means every tab already hears the
			// originator directly.
			if (origin === ChangeOrigin.local) {
				channel?.postMessage(Array.from(update));
			}
		});
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
		// Broadcast our offline state FIRST, while the onUpdate relay is still
		// subscribed and the channel is still open — otherwise the update fires
		// into a torn-down relay and peers keep a stale presence for this client.
		awareness.setLocalState(null);
		unsubscribeChange();
		unsubscribeUpdate?.();
		channel?.close();
		channel = null;
	}

	onScopeDispose(destroy);

	return { remoteStates, setCursor, setSelectedNodeIds, destroy };
}
