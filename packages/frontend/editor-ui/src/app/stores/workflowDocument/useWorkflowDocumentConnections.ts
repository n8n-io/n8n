import { computed } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { IConnection, IConnections, INodeConnections } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { CHANGE_ACTION } from './types';
import type { ChangeEvent } from './types';

// --- Event types ---

export type ConnectionAddedPayload = { connection: IConnection[] };
export type ConnectionRemovedPayload = { connection: IConnection[] };
export type AllNodeConnectionsRemovedPayload = { nodeName: string };

export type ConnectionsChangeEvent =
	| ChangeEvent<ConnectionAddedPayload>
	| ChangeEvent<ConnectionRemovedPayload>
	| ChangeEvent<AllNodeConnectionsRemovedPayload>;

// --- Deps ---

export interface WorkflowDocumentConnectionsDeps {
	getNodeById: (id: string) => INodeUi | undefined;
}

// --- Composable ---

// TODO: This composable currently delegates to workflowsStore for reads and writes.
// The long-term goal is to remove workflowsStore entirely — connections will become
// private state owned by workflowDocumentStore. Once that happens, the direct import
// (and the import-cycle warning it causes) will go away.
export function useWorkflowDocumentConnections(deps: WorkflowDocumentConnectionsDeps) {
	const workflowsStore = useWorkflowsStore();

	const onConnectionsChange = createEventHook<ConnectionsChangeEvent>();
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	// -----------------------------------------------------------------------
	// Apply methods (private) — the only functions that mutate state
	// -----------------------------------------------------------------------

	function applySetConnections(value: IConnections) {
		workflowsStore.setConnections(value);
	}

	function applyAddConnection(data: { connection: IConnection[] }) {
		workflowsStore.addConnection(data);
		void onConnectionsChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { connection: data.connection },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveConnection(data: { connection: IConnection[] }) {
		workflowsStore.removeConnection(data);
		void onConnectionsChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { connection: data.connection },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveAllNodeConnection(
		node: INodeUi,
		opts?: { preserveInputConnections?: boolean; preserveOutputConnections?: boolean },
	) {
		workflowsStore.removeAllNodeConnection(node, opts);
		void onConnectionsChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { nodeName: node.name },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveAllConnections() {
		workflowsStore.setConnections({});
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const connectionsBySourceNode = computed<IConnections>(
		() => workflowsStore.connectionsBySourceNode,
	);

	const connectionsByDestinationNode = computed<IConnections>(
		() => workflowsStore.connectionsByDestinationNode,
	);

	function outgoingConnectionsByNodeName(nodeName: string): INodeConnections {
		return workflowsStore.outgoingConnectionsByNodeName(nodeName);
	}

	function incomingConnectionsByNodeName(nodeName: string): INodeConnections {
		return workflowsStore.incomingConnectionsByNodeName(nodeName);
	}

	function nodeHasOutputConnection(nodeName: string): boolean {
		return workflowsStore.nodeHasOutputConnection(nodeName);
	}

	function isNodeInOutgoingNodeConnections(
		rootNodeName: string,
		searchNodeName: string,
		depth = -1,
	): boolean {
		return workflowsStore.isNodeInOutgoingNodeConnections(rootNodeName, searchNodeName, depth);
	}

	// -----------------------------------------------------------------------
	// Write API
	// -----------------------------------------------------------------------

	function setConnections(value: IConnections): void {
		applySetConnections(value);
	}

	function addConnection(data: { connection: IConnection[] }): void {
		applyAddConnection(data);
	}

	function removeConnection(data: { connection: IConnection[] }): void {
		applyRemoveConnection(data);
	}

	function removeAllNodeConnection(
		node: INodeUi,
		opts?: { preserveInputConnections?: boolean; preserveOutputConnections?: boolean },
	): void {
		applyRemoveAllNodeConnection(node, opts);
	}

	function removeNodeConnectionsById(nodeId: string): void {
		const node = deps.getNodeById(nodeId);
		if (!node) return;
		applyRemoveAllNodeConnection(node);
	}

	function removeAllConnections(): void {
		applyRemoveAllConnections();
	}

	return {
		// Read
		connectionsBySourceNode,
		connectionsByDestinationNode,
		outgoingConnectionsByNodeName,
		incomingConnectionsByNodeName,
		nodeHasOutputConnection,
		isNodeInOutgoingNodeConnections,

		// Write
		setConnections,
		addConnection,
		removeConnection,
		removeAllNodeConnection,
		removeNodeConnectionsById,
		removeAllConnections,

		// Events
		onConnectionsChange: onConnectionsChange.on,
		onStateDirty: onStateDirty.on,
	};
}
