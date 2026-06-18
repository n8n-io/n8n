import { onScopeDispose } from 'vue';
import { BroadcastChannelTransport, createHandshakeSyncProvider } from '@n8n/crdt';
import type { CRDTDoc, CRDTUndoManager, SyncProvider } from '@n8n/crdt';
import { crdtProvider } from './provider';
import {
	useWorkflowDocumentCrdtMirror,
	type WorkflowDocumentCrdtMirrorDeps,
} from './useWorkflowDocumentCrdtMirror';

export interface WorkflowDocumentCollaborationDeps
	extends Omit<WorkflowDocumentCrdtMirrorDeps, 'doc'> {
	/** Stable id for the CRDT doc and the cross-tab channel (the store id). */
	docId: string;
}

export interface WorkflowDocumentCollaboration {
	/** The underlying CRDT document — used for awareness and undo. */
	doc: CRDTDoc;
	/** Undo manager tracking local document transactions (collaborative undo). */
	undoManager: CRDTUndoManager;
	/** Full reconcile of the doc from the store (call after bulk store ops). */
	sync: () => void;
	/** Tear down sync, mirror, undo, awareness and the doc. */
	destroy: () => void;
}

/**
 * Wires a workflow document store into a CRDT collaboration stack:
 *
 * - a {@link useWorkflowDocumentCrdtMirror} bridging the store ↔ the doc,
 * - cross-tab sync via {@link BroadcastChannelTransport} (no backend),
 * - an undo manager for collaborative undo/redo.
 *
 * Awareness (presence/cursors) is layered separately on top of the exposed
 * `doc` by `useWorkflowDocumentAwareness`, on its own channel.
 *
 * All resources are torn down on scope dispose, so the store's `$dispose()`
 * cascades cleanup automatically.
 */
export function useWorkflowDocumentCollaboration(
	deps: WorkflowDocumentCollaborationDeps,
): WorkflowDocumentCollaboration {
	const { docId, ...mirrorDeps } = deps;

	const doc = crdtProvider.createDoc(docId);
	const mirror = useWorkflowDocumentCrdtMirror({ doc, ...mirrorDeps });
	const undoManager = doc.createUndoManager();

	// Cross-tab document sync. BroadcastChannel is same-origin and client-only,
	// so no backend endpoint is involved. Guarded for environments without the
	// API (older browsers / SSR / unit tests).
	let sync: SyncProvider | null = null;
	if (typeof BroadcastChannel !== 'undefined') {
		const transport = new BroadcastChannelTransport(docId);
		// Handshake provider so a tab opened mid-edit catches up to the current
		// document state (state-vector exchange), not just future updates.
		sync = createHandshakeSyncProvider(doc, transport);
		void sync.start();
	}

	function destroy() {
		sync?.stop();
		mirror.destroy();
		// doc.destroy() also tears down the undo manager and awareness.
		doc.destroy();
	}

	onScopeDispose(destroy);

	return { doc, undoManager, sync: mirror.sync, destroy };
}
