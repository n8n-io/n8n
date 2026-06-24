import { onScopeDispose } from 'vue';
import {
	BroadcastChannelTransport,
	createHandshakeSyncProvider,
	WebSocketTransport,
} from '@n8n/crdt';
import type { CRDTDoc, CRDTUndoManager, SyncProvider } from '@n8n/crdt';
import { crdtProvider } from './provider';
import { createWebSocketAwarenessRelay, type AwarenessRelay } from './awarenessRelay';
import {
	useWorkflowDocumentCrdtMirror,
	type WorkflowDocumentCrdtMirrorDeps,
} from './useWorkflowDocumentCrdtMirror';

export interface WorkflowDocumentCollaborationDeps
	extends Omit<WorkflowDocumentCrdtMirrorDeps, 'doc'> {
	/** Stable id for the CRDT doc and the cross-tab channel (the store id). */
	docId: string;
	/**
	 * Collaboration topology:
	 * - `local`  – cross-tab sync via BroadcastChannel (no backend).
	 * - `server` – sync through the CRDT WebSocket endpoint at `serverUrl`,
	 *              shared across browsers and users.
	 */
	mode: 'local' | 'server';
	/** CRDT server WebSocket URL — required (and only used) in `server` mode. */
	serverUrl?: string;
}

export interface WorkflowDocumentCollaboration {
	/** The underlying CRDT document — used for awareness and undo. */
	doc: CRDTDoc;
	/** Undo manager tracking local document transactions (collaborative undo). */
	undoManager: CRDTUndoManager;
	/**
	 * Server-backed awareness relay (presence/cursors over the same socket), or
	 * `null` in local mode where awareness stays on its own cross-tab channel.
	 */
	awarenessRelay: AwarenessRelay | null;
	/** Full reconcile of the doc from the store (call after bulk store ops). */
	sync: () => void;
	/** Tear down sync, mirror, undo, awareness and the doc. */
	destroy: () => void;
}

/**
 * Wires a workflow document store into a CRDT collaboration stack:
 *
 * - a {@link useWorkflowDocumentCrdtMirror} bridging the store ↔ the doc,
 * - document sync over either {@link BroadcastChannelTransport} (local, cross-tab)
 *   or {@link WebSocketTransport} (server, cross-browser/user),
 * - an undo manager for collaborative undo/redo.
 *
 * Awareness (presence/cursors) is layered separately on top of the exposed
 * `doc` by `useWorkflowDocumentAwareness`. In server mode it is relayed over the
 * same socket via the exposed `awarenessRelay`; in local mode it uses its own
 * cross-tab channel.
 *
 * All resources are torn down on scope dispose, so the store's `$dispose()`
 * cascades cleanup automatically.
 */
export function useWorkflowDocumentCollaboration(
	deps: WorkflowDocumentCollaborationDeps,
): WorkflowDocumentCollaboration {
	const { docId, mode, serverUrl, ...mirrorDeps } = deps;

	const doc = crdtProvider.createDoc(docId);
	const mirror = useWorkflowDocumentCrdtMirror({ doc, ...mirrorDeps });
	const undoManager = doc.createUndoManager();

	// Document sync provider. The handshake provider lets a peer joining mid-edit
	// catch up to the current state (state-vector exchange), not just future
	// updates. Server mode also relays awareness over the same socket.
	let sync: SyncProvider | null = null;
	let awarenessRelay: AwarenessRelay | null = null;

	if (mode === 'server' && serverUrl) {
		const transport = new WebSocketTransport({ url: serverUrl });
		sync = createHandshakeSyncProvider(doc, transport);
		awarenessRelay = createWebSocketAwarenessRelay(transport);
	} else if (typeof BroadcastChannel !== 'undefined') {
		// Cross-tab document sync. BroadcastChannel is same-origin and client-only,
		// so no backend endpoint is involved. Guarded for environments without the
		// API (older browsers / SSR / unit tests).
		sync = createHandshakeSyncProvider(doc, new BroadcastChannelTransport(docId));
	}

	if (sync) {
		// Surface sync failures (malformed peer updates, transport errors) instead
		// of swallowing them — collaboration is best-effort, so we log rather than
		// disrupt editing.
		sync.onError((error) => {
			console.error(`[crdt] sync error for document "${docId}":`, error);
		});
		void sync.start().catch((error) => {
			console.error(`[crdt] failed to start sync for document "${docId}":`, error);
		});
	}

	function destroy() {
		sync?.stop();
		awarenessRelay?.destroy();
		mirror.destroy();
		// doc.destroy() also tears down the undo manager and awareness.
		doc.destroy();
	}

	onScopeDispose(destroy);

	return { doc, undoManager, awarenessRelay, sync: mirror.sync, destroy };
}
