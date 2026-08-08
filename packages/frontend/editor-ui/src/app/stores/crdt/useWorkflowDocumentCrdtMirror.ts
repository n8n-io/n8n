import { deepCopy } from 'n8n-workflow';
import type {
	IConnections,
	INodeConnections,
	INodeExecutionData,
	IPinData,
	IWorkflowSettings,
} from 'n8n-workflow';
import type { ComputedRef, Ref, ShallowRef } from 'vue';
import { ChangeAction, ChangeOrigin, isMapChange } from '@n8n/crdt';
import type { CRDTDoc, DeepChangeEvent } from '@n8n/crdt';
import type { INodeUi } from '@/Interface';
import { CHANGE_ACTION } from '../workflowDocument/types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodeUpdatedPayload,
	NodesChangeEvent,
} from '../workflowDocument/useWorkflowDocumentNodes';
import type { ConnectionsChangeEvent } from '../workflowDocument/useWorkflowDocumentConnections';
import type { PinDataChangeEvent } from '../workflowDocument/useWorkflowDocumentPinData';
import type { SettingsChangeEvent } from '../workflowDocument/useWorkflowDocumentSettings';
import type { NameChangeEvent } from '../workflowDocument/useWorkflowDocumentName';

/** Subscriber side of a `createEventHook` (the composables expose `hook.on`). */
type EventHookOn<T> = (cb: (event: T) => void) => unknown;

export interface WorkflowDocumentCrdtMirrorDeps {
	doc: CRDTDoc;
	// Reads — used to seed the doc and resolve targeted write-throughs.
	nodesById: ShallowRef<Map<string, INodeUi>>;
	connectionsBySourceNode: ComputedRef<IConnections>;
	getPinDataSnapshot: () => IPinData;
	name: Readonly<Ref<string>>;
	getSettingsSnapshot: () => IWorkflowSettings;
	// Local change hooks — drive the ref → doc write-through.
	onNodesChange: EventHookOn<NodesChangeEvent>;
	onConnectionsChange: EventHookOn<ConnectionsChangeEvent>;
	onPinnedDataChange: EventHookOn<PinDataChangeEvent>;
	onSettingsChange: EventHookOn<SettingsChangeEvent>;
	onNameChange: EventHookOn<NameChangeEvent>;
	// Public setters — the doc → ref applier calls these for remote/undo changes.
	addNode: (node: INodeUi) => void;
	updateNodeById: (id: string, partial: Partial<INodeUi>) => boolean;
	removeNodeById: (id: string) => void;
	setConnections: (connections: IConnections) => void;
	pinNodeData: (nodeName: string, data: INodeExecutionData[]) => void;
	unpinNodeData: (nodeName: string) => void;
	setName: (name: string) => void;
	setSettings: (settings: IWorkflowSettings) => void;
}

export interface WorkflowDocumentCrdtMirror {
	/** Full reconcile of every root map from current store state (one transaction). */
	sync: () => void;
	/** Unsubscribe the remote applier and stop writing to the doc. */
	destroy: () => void;
}

const NODES = 'nodes';
const CONNECTIONS = 'connections';
const PIN_DATA = 'pinData';
const META = 'meta';
const META_NAME = 'name';
const META_SETTINGS = 'settings';

/**
 * Mirrors a workflow document store into a CRDT document and back.
 *
 * The Vue refs inside the document store remain the source of truth; the doc is
 * a synchronized mirror. Local mutations flow ref → doc through the composable
 * change hooks; remote (and undo/redo) changes flow doc → ref through the
 * store's public setters. Two guards keep the bridge loop-free: the batch
 * handler ignores `origin === local`, and `isApplyingRemote` suppresses the
 * write-through while the applier is replaying changes into the store.
 *
 * Values are stored as atomic plain-object snapshots (last-write-wins per
 * entity) — sufficient for cross-tab editing and leaving the document
 * composables untouched.
 *
 * v1 caveats (acceptable for the experiment, documented for follow-up):
 * - Remote node updates apply via shallow merge (`updateNodeById`), so a node
 *   property *deleted* concurrently on a peer may not propagate; value changes
 *   and additions do.
 * - Scalar `meta` keys (name/settings) converge cleanly only from a shared
 *   hydrated base (both tabs loaded the same server workflow).
 */
export function useWorkflowDocumentCrdtMirror(
	deps: WorkflowDocumentCrdtMirrorDeps,
): WorkflowDocumentCrdtMirror {
	const { doc } = deps;
	const nodesMap = doc.getMap<INodeUi>(NODES);
	const connectionsMap = doc.getMap<INodeConnections>(CONNECTIONS);
	const pinDataMap = doc.getMap<INodeExecutionData[]>(PIN_DATA);
	const metaMap = doc.getMap(META);

	let isApplyingRemote = false;
	let destroyed = false;

	// --- ref → doc (write-through, inline: the caller owns the transaction) ---

	function reconcileNodesInline() {
		const current = deps.nodesById.value;
		for (const [id, node] of current) nodesMap.set(id, deepCopy(node));
		for (const id of [...nodesMap.keys()]) {
			if (!current.has(id)) nodesMap.delete(id);
		}
	}

	function reconcileConnectionsInline() {
		const current = deps.connectionsBySourceNode.value;
		for (const sourceName of Object.keys(current)) {
			connectionsMap.set(sourceName, deepCopy(current[sourceName]));
		}
		for (const sourceName of [...connectionsMap.keys()]) {
			if (!(sourceName in current)) connectionsMap.delete(sourceName);
		}
	}

	function reconcilePinDataInline() {
		const current = deps.getPinDataSnapshot();
		for (const nodeName of Object.keys(current)) {
			pinDataMap.set(nodeName, deepCopy(current[nodeName]));
		}
		for (const nodeName of [...pinDataMap.keys()]) {
			if (!(nodeName in current)) pinDataMap.delete(nodeName);
		}
	}

	function reconcileMetaInline() {
		metaMap.set(META_NAME, deps.name.value);
		metaMap.set(META_SETTINGS, deepCopy(deps.getSettingsSnapshot()));
	}

	// --- doc → ref (remote applier) ---

	function applyRemote(fn: () => void) {
		isApplyingRemote = true;
		try {
			fn();
		} finally {
			isApplyingRemote = false;
		}
	}

	function applyNodeChange(change: DeepChangeEvent) {
		const nodeId = String(change.path[0]);
		if (change.action === ChangeAction.delete) {
			deps.removeNodeById(nodeId);
			return;
		}
		const node = change.value as INodeUi;
		if (deps.nodesById.value.has(nodeId)) {
			deps.updateNodeById(nodeId, node);
		} else {
			deps.addNode(node);
		}
	}

	function applyPinDataChange(change: DeepChangeEvent) {
		const nodeName = String(change.path[0]);
		if (change.action === ChangeAction.delete) {
			deps.unpinNodeData(nodeName);
		} else {
			deps.pinNodeData(nodeName, change.value as INodeExecutionData[]);
		}
	}

	function applyMetaChange(change: DeepChangeEvent) {
		if (change.action === ChangeAction.delete) return;
		const key = String(change.path[0]);
		if (key === META_NAME) deps.setName(change.value as string);
		else if (key === META_SETTINGS) deps.setSettings(change.value as IWorkflowSettings);
	}

	const unsubscribeBatch = doc.onTransactionBatch([NODES, CONNECTIONS, PIN_DATA, META], (batch) => {
		// Local writes are the write-through echoing our own ref mutations — ignore
		// them. Only remote peers and undo/redo drive the applier.
		if (batch.origin === ChangeOrigin.local) return;
		applyRemote(() => {
			for (const [mapName, changes] of batch.changes) {
				if (mapName === CONNECTIONS) {
					// Rebuild wholesale: the store's only non-mutating connections
					// setter is `setConnections`, and rebuilding from the doc keeps
					// source-node buckets internally consistent. The cast is needed
					// because the CRDT map's `toJSON()` is untyped.
					deps.setConnections(connectionsMap.toJSON() as IConnections);
					continue;
				}
				for (const change of changes) {
					if (!isMapChange(change)) continue;
					if (mapName === NODES) applyNodeChange(change);
					else if (mapName === PIN_DATA) applyPinDataChange(change);
					else if (mapName === META) applyMetaChange(change);
				}
			}
		});
	});

	// --- local change subscriptions (write-through) ---

	function writeThrough(fn: () => void) {
		if (isApplyingRemote || destroyed) return;
		doc.transact(fn);
	}

	deps.onNodesChange((event: NodesChangeEvent) => {
		writeThrough(() => {
			switch (event.action) {
				case CHANGE_ACTION.ADD: {
					const { node } = event.payload as NodeAddedPayload;
					nodesMap.set(node.id, deepCopy(node));
					break;
				}
				case CHANGE_ACTION.UPDATE: {
					// Resolve by the stable id (the nodesMap key), not by name — a
					// rename changes the name, and the name index isn't rebuilt on
					// updates, so a name lookup could miss and drop the write-through.
					const { id } = event.payload as NodeUpdatedPayload;
					const node = deps.nodesById.value.get(id);
					if (node) nodesMap.set(node.id, deepCopy(node));
					break;
				}
				case CHANGE_ACTION.DELETE: {
					const { id } = event.payload as NodeRemovedPayload;
					if (id) nodesMap.delete(id);
					else reconcileNodesInline();
					break;
				}
				default:
					// SET / reset / unknown — reconcile the whole map.
					reconcileNodesInline();
			}
		});
	});

	deps.onConnectionsChange(() => {
		// Every connections mutation routes here — granular add/remove and the
		// bulk `setConnections` (SET) — so reconcile the whole (small) map rather
		// than diffing per-event payloads.
		writeThrough(reconcileConnectionsInline);
	});

	deps.onPinnedDataChange((event: PinDataChangeEvent) => {
		writeThrough(() => {
			if ('pinData' in event.payload) {
				reconcilePinDataInline();
				return;
			}
			const { nodeName, data } = event.payload;
			if (event.action === CHANGE_ACTION.DELETE || data === undefined) {
				pinDataMap.delete(nodeName);
			} else {
				pinDataMap.set(nodeName, deepCopy(data));
			}
		});
	});

	deps.onSettingsChange(() => {
		writeThrough(() => metaMap.set(META_SETTINGS, deepCopy(deps.getSettingsSnapshot())));
	});

	deps.onNameChange(() => {
		writeThrough(() => metaMap.set(META_NAME, deps.name.value));
	});

	function sync() {
		if (destroyed) return;
		doc.transact(() => {
			reconcileNodesInline();
			reconcileConnectionsInline();
			reconcilePinDataInline();
			reconcileMetaInline();
		});
	}

	function destroy() {
		destroyed = true;
		unsubscribeBatch();
	}

	// Seed the doc from whatever state the store already holds (usually empty at
	// construction; the store re-syncs after `hydrate`/`reset`).
	sync();

	return { sync, destroy };
}
