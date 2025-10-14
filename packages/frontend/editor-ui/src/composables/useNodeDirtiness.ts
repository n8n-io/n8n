import {
	AddConnectionCommand,
	AddNodeCommand,
	BulkCommand,
	EnableNodeToggleCommand,
	RemoveConnectionCommand,
	RemoveNodeCommand,
	type Undoable,
} from '@/models/history';
import { useHistoryStore } from '@/stores/history.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { CanvasNodeDirtiness, type CanvasNodeDirtinessType } from '@/features/canvas/canvas.types';
import type { INodeConnections, NodeConnectionType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { computed } from 'vue';

/**
 * Does the command make the given node dirty?
 */
function shouldCommandMarkDirty(
	command: Undoable,
	nodeName: string,
	siblingCommands: Undoable[],
	getIncomingConnections: (nodeName: string) => INodeConnections,
	getOutgoingConnectors: (nodeName: string) => INodeConnections,
): boolean {
	if (command instanceof BulkCommand) {
		return command.commands.some((cmd) =>
			shouldCommandMarkDirty(
				cmd,
				nodeName,
				command.commands,
				getIncomingConnections,
				getOutgoingConnectors,
			),
		);
	}

	if (command instanceof AddConnectionCommand) {
		return command.connectionData[1]?.node === nodeName;
	}

	if (command instanceof RemoveConnectionCommand) {
		const [from, to] = command.connectionData;

		if (to.node !== nodeName) {
			return false;
		}

		// the connection was removed along with its source node
		return siblingCommands.some(
			(sibling) => sibling instanceof RemoveNodeCommand && sibling.node.name === from.node,
		);
	}

	const incomingNodes = Object.values(getIncomingConnections(nodeName))
		.flat()
		.flat()
		.filter((connection) => connection !== null)
		.map((connection) => connection.node);

	if (command instanceof AddNodeCommand) {
		return incomingNodes.includes(command.node.name);
	}

	if (command instanceof EnableNodeToggleCommand) {
		return (
			incomingNodes.includes(command.nodeName) &&
			(command.newState ||
				Object.keys(getOutgoingConnectors(command.nodeName)).some(
					(type) => (type as NodeConnectionType) !== NodeConnectionTypes.Main,
				))
		);
	}

	return false;
}

/**
 * If given node is part of a loop, returns the set of nodes that forms the loop, otherwise returns undefined.
 */
function findLoop(
	nodeName: string,
	visited: string[],
	getIncomingConnections: (nodeName: string) => INodeConnections,
): string[] | undefined {
	const index = visited.indexOf(nodeName);

	if (index >= 0) {
		return visited.slice(index);
	}

	const newVisited = [...visited, nodeName];

	for (const [type, typeConnections] of Object.entries(getIncomingConnections(nodeName))) {
		if ((type as NodeConnectionType) !== NodeConnectionTypes.Main) {
			continue;
		}

		for (const connections of typeConnections) {
			for (const { node } of connections ?? []) {
				const loop = findLoop(node, newVisited, getIncomingConnections);

				if (loop) {
					return loop;
				}
			}
		}
	}

	return undefined;
}

/**
 * Determines the subgraph that is affected by changes made after the last (partial) execution
 */
export function useNodeDirtiness() {
	const historyStore = useHistoryStore();
	const workflowsStore = useWorkflowsStore();

	function getParentSubNodes(nodeName: string) {
		return Object.entries(workflowsStore.incomingConnectionsByNodeName(nodeName))
			.filter(([type]) => (type as NodeConnectionType) !== NodeConnectionTypes.Main)
			.flatMap(([, typeConnections]) => typeConnections.flat().filter((conn) => conn !== null));
	}

	function getDirtinessByParametersUpdate(
		nodeName: string,
		after: number,
	): CanvasNodeDirtinessType | undefined {
		if ((workflowsStore.getParametersLastUpdate(nodeName) ?? 0) > after) {
			return CanvasNodeDirtiness.PARAMETERS_UPDATED;
		}

		for (const connection of getParentSubNodes(nodeName)) {
			if (getDirtinessByParametersUpdate(connection.node, after) !== undefined) {
				return CanvasNodeDirtiness.UPSTREAM_DIRTY;
			}
		}

		return undefined;
	}

	function getDirtinessByConnectionsUpdate(
		nodeName: string,
		after: number,
	): CanvasNodeDirtinessType | undefined {
		for (let i = historyStore.undoStack.length - 1; i >= 0; i--) {
			const command = historyStore.undoStack[i];

			if (command.getTimestamp() < after) {
				break;
			}

			if (
				shouldCommandMarkDirty(
					command,
					nodeName,
					[],
					workflowsStore.incomingConnectionsByNodeName,
					workflowsStore.outgoingConnectionsByNodeName,
				)
			) {
				return CanvasNodeDirtiness.INCOMING_CONNECTIONS_UPDATED;
			}
		}

		for (const connection of getParentSubNodes(nodeName)) {
			if (getDirtinessByConnectionsUpdate(connection.node, after) !== undefined) {
				return CanvasNodeDirtiness.UPSTREAM_DIRTY;
			}
		}

		return undefined;
	}

	/**
	 * Depth of node is defined as the minimum distance (number of connections) from the trigger node
	 */
	const depthByName = computed(() => {
		const depth: Record<string, number> = {};

		function setDepthRecursively(nodeName: string, current: number, visited: Set<string>) {
			if (visited.has(nodeName)) {
				return;
			}

			const myVisited = new Set<string>(visited);

			myVisited.add(nodeName);

			for (const [type, typeConnections] of Object.entries(
				workflowsStore.outgoingConnectionsByNodeName(nodeName),
			)) {
				if ((type as NodeConnectionType) !== NodeConnectionTypes.Main) {
					continue;
				}

				for (const connections of typeConnections) {
					for (const { node } of connections ?? []) {
						if (!depth[node] || depth[node] > current) {
							depth[node] = current;
						}

						setDepthRecursively(node, current + 1, myVisited);
					}
				}
			}
		}

		for (const startNode of workflowsStore.allNodes) {
			const hasIncomingNode =
				Object.keys(workflowsStore.incomingConnectionsByNodeName(startNode.name)).length > 0;

			if (hasIncomingNode) {
				continue;
			}

			depth[startNode.name] = 0;
			setDepthRecursively(startNode.name, 1, new Set());
		}

		return depth;
	});

	const dirtinessByName = computed(() => {
		const dirtiness: Record<string, CanvasNodeDirtinessType | undefined> = {};
		const runDataByNode = workflowsStore.getWorkflowRunData ?? {};

		function setDirtiness(nodeName: string, value: CanvasNodeDirtinessType) {
			dirtiness[nodeName] = dirtiness[nodeName] ?? value;

			const loop = findLoop(nodeName, [], workflowsStore.incomingConnectionsByNodeName);

			if (!loop) {
				return;
			}

			const loopEntryNodeName = [...loop].sort(
				(a, b) =>
					(depthByName.value[a] ?? Number.MAX_SAFE_INTEGER) -
					(depthByName.value[b] ?? Number.MAX_SAFE_INTEGER),
			)?.[0];

			if (loopEntryNodeName && depthByName.value[loopEntryNodeName]) {
				// If a node in a loop becomes dirty, the first node in the loop should also be dirty
				dirtiness[loopEntryNodeName] =
					dirtiness[loopEntryNodeName] ?? CanvasNodeDirtiness.UPSTREAM_DIRTY;
			}
		}

		for (const [nodeName, runData] of Object.entries(runDataByNode)) {
			const runAt = runData[0]?.startTime ?? 0;

			if (!runAt) {
				continue;
			}

			const parameterUpdate = getDirtinessByParametersUpdate(nodeName, runAt);

			if (parameterUpdate) {
				setDirtiness(nodeName, parameterUpdate);
				continue;
			}

			const connectionUpdate = getDirtinessByConnectionsUpdate(nodeName, runAt);

			if (connectionUpdate) {
				setDirtiness(nodeName, connectionUpdate);
				continue;
			}

			const hasInputPinnedDataChanged = Object.values(
				workflowsStore.incomingConnectionsByNodeName(nodeName),
			)
				.flat()
				.flat()
				.filter((connection) => connection !== null)
				.some((connection) => {
					const pinnedDataLastUpdatedAt =
						workflowsStore.getPinnedDataLastUpdate(connection.node) ?? 0;

					return pinnedDataLastUpdatedAt > runAt;
				});

			if (hasInputPinnedDataChanged) {
				setDirtiness(nodeName, CanvasNodeDirtiness.PINNED_DATA_UPDATED);
				continue;
			}

			const pinnedDataLastRemovedAt = workflowsStore.getPinnedDataLastRemovedAt(nodeName) ?? 0;

			if (pinnedDataLastRemovedAt > runAt) {
				setDirtiness(nodeName, CanvasNodeDirtiness.PINNED_DATA_UPDATED);
				continue;
			}
		}

		return dirtiness;
	});

	return { dirtinessByName };
}
