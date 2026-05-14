import { computed, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { IConnection, IConnections, INodeConnections } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { CHANGE_ACTION } from './types';
import type { ChangeEvent } from './types';
import * as workflowUtils from 'n8n-workflow/common';

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
	syncWorkflowObject: (connections: IConnections) => void;
}

// --- Composable ---

// TODO: This composable currently delegates to workflowsStore for reads and writes.
// The long-term goal is to remove workflowsStore entirely — connections will become
// private state owned by workflowDocumentStore. Once that happens, the direct import
// (and the import-cycle warning it causes) will go away.
export function useWorkflowDocumentConnections(deps: WorkflowDocumentConnectionsDeps) {
	const connections = ref<IConnections>({});

	const onConnectionsChange = createEventHook<ConnectionsChangeEvent>();
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	// -----------------------------------------------------------------------
	// Apply methods (private) — the only functions that mutate state
	// -----------------------------------------------------------------------

	function applySetConnections(value: IConnections) {
		connections.value = value;
		deps.syncWorkflowObject(connections.value);
	}

	function applyAddConnection(data: { connection: IConnection[] }) {
		if (data.connection.length !== 2) return;

		const sourceData: IConnection = data.connection[0];
		const destinationData: IConnection = data.connection[1];
		const wfConnections = connections.value;

		if (!wfConnections.hasOwnProperty(sourceData.node)) {
			wfConnections[sourceData.node] = {};
		}

		if (!wfConnections[sourceData.node].hasOwnProperty(sourceData.type)) {
			wfConnections[sourceData.node] = {
				...wfConnections[sourceData.node],
				[sourceData.type]: [],
			};
		}

		if (wfConnections[sourceData.node][sourceData.type].length < sourceData.index + 1) {
			for (
				let i = wfConnections[sourceData.node][sourceData.type].length;
				i <= sourceData.index;
				i++
			) {
				wfConnections[sourceData.node][sourceData.type].push([]);
			}
		}

		const checkProperties = ['index', 'node', 'type'] as Array<keyof IConnection>;
		let connectionExists = false;
		const nodeConnections = wfConnections[sourceData.node][sourceData.type];
		const connectionsToCheck = nodeConnections[sourceData.index];

		if (connectionsToCheck) {
			connectionLoop: for (const existingConnection of connectionsToCheck) {
				for (const prop of checkProperties) {
					if (existingConnection[prop] !== destinationData[prop]) {
						continue connectionLoop;
					}
				}
				connectionExists = true;
				break;
			}
		}

		if (!connectionExists) {
			nodeConnections[sourceData.index] = nodeConnections[sourceData.index] ?? [];
			const connections = nodeConnections[sourceData.index];
			if (connections) {
				connections.push(destinationData);
			}
		}

		deps.syncWorkflowObject(connections.value);
		void onConnectionsChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { connection: data.connection },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveConnection(data: { connection: IConnection[] }) {
		const sourceData = data.connection[0];
		const destinationData = data.connection[1];

		if (!connections.value.hasOwnProperty(sourceData.node)) return;
		if (!connections.value[sourceData.node].hasOwnProperty(sourceData.type)) return;
		if (connections.value[sourceData.node][sourceData.type].length < sourceData.index + 1) return;

		const matchedConnections =
			connections.value[sourceData.node][sourceData.type][sourceData.index];
		if (!matchedConnections) return;

		for (const index in matchedConnections) {
			if (
				matchedConnections[index].node === destinationData.node &&
				matchedConnections[index].type === destinationData.type &&
				matchedConnections[index].index === destinationData.index
			) {
				matchedConnections.splice(Number.parseInt(index, 10), 1);
			}
		}

		deps.syncWorkflowObject(connections.value);
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
		const preserveInput = opts?.preserveInputConnections ?? false;
		const preserveOutput = opts?.preserveOutputConnections ?? false;
		const wfConnections = connections.value;

		if (!preserveOutput) {
			delete wfConnections[node.name];
		}

		if (!preserveInput) {
			for (const sourceNode of Object.keys(wfConnections)) {
				for (const type of Object.keys(wfConnections[sourceNode])) {
					for (const sourceIndex of Object.keys(wfConnections[sourceNode][type])) {
						const connectionsToRemove =
							wfConnections[sourceNode][type][Number.parseInt(sourceIndex, 10)];
						if (connectionsToRemove) {
							const indexesToRemove: string[] = [];
							for (const connectionIndex of Object.keys(connectionsToRemove)) {
								if (connectionsToRemove[Number.parseInt(connectionIndex, 10)].node === node.name) {
									indexesToRemove.push(connectionIndex);
								}
							}
							for (const index of indexesToRemove) {
								connectionsToRemove.splice(Number.parseInt(index, 10), 1);
							}
						}
					}
				}
			}
		}

		deps.syncWorkflowObject(connections.value);
		void onConnectionsChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { nodeName: node.name },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveAllConnections() {
		connections.value = {};
		deps.syncWorkflowObject(connections.value);
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const connectionsBySourceNode = computed(() => connections.value);

	const connectionsByDestinationNode = computed<IConnections>(() =>
		workflowUtils.mapConnectionsByDestination(connections.value),
	);

	function outgoingConnectionsByNodeName(nodeName: string): INodeConnections {
		if (connectionsBySourceNode.value.hasOwnProperty(nodeName)) {
			return connectionsBySourceNode.value[nodeName] as unknown as INodeConnections;
		}
		return {};
	}

	function incomingConnectionsByNodeName(nodeName: string): INodeConnections {
		if (connectionsByDestinationNode.value.hasOwnProperty(nodeName)) {
			return connectionsByDestinationNode.value[nodeName] as unknown as INodeConnections;
		}
		return {};
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
