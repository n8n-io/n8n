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
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type CanvasNodeDirtiness } from '@/types';
import { type INodeConnections, NodeConnectionType } from 'n8n-workflow';
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
					(type) => (type as NodeConnectionType) !== NodeConnectionType.Main,
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
	visited: Set<string>,
	getIncomingConnections: (nodeName: string) => INodeConnections,
): Set<string> | undefined {
	if (visited.has(nodeName)) {
		return visited;
	}

	const visitedCopy = new Set(visited);

	visitedCopy.add(nodeName);

	for (const [type, typeConnections] of Object.entries(getIncomingConnections(nodeName))) {
		if ((type as NodeConnectionType) !== NodeConnectionType.Main) {
			continue;
		}

		for (const connections of typeConnections) {
			for (const { node } of connections ?? []) {
				const loop = findLoop(node, visitedCopy, getIncomingConnections);

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
	const settingsStore = useSettingsStore();

	function getParentSubNodes(nodeName: string) {
		return Object.entries(workflowsStore.incomingConnectionsByNodeName(nodeName))
			.filter(([type]) => (type as NodeConnectionType) !== NodeConnectionType.Main)
			.flatMap(([, typeConnections]) => typeConnections.flat().filter((conn) => conn !== null));
	}

	function getParameterUpdateType(
		nodeName: string,
		after: number,
	): CanvasNodeDirtiness | undefined {
		if ((workflowsStore.getParametersLastUpdate(nodeName) ?? 0) > after) {
			return 'parameters-updated';
		}

		for (const connection of getParentSubNodes(nodeName)) {
			if (getParameterUpdateType(connection.node, after) !== undefined) {
				return 'upstream-dirty';
			}
		}

		return undefined;
	}

	function getConnectionUpdateType(
		nodeName: string,
		after: number,
	): CanvasNodeDirtiness | undefined {
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
				return 'incoming-connections-updated';
			}
		}

		for (const connection of getParentSubNodes(nodeName)) {
			if (getConnectionUpdateType(connection.node, after) !== undefined) {
				return 'upstream-dirty';
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
				if ((type as NodeConnectionType) !== NodeConnectionType.Main) {
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

		for (const trigger of workflowsStore.workflowTriggerNodes) {
			depth[trigger.name] = 0;
			setDepthRecursively(trigger.name, 1, new Set());
		}

		return depth;
	});

	const dirtinessByName = computed(() => {
		// Do not highlight dirtiness if new partial execution is not enabled
		if (settingsStore.partialExecutionVersion === 1) {
			return {};
		}

		const dirtiness: Record<string, CanvasNodeDirtiness | undefined> = {};
		const runDataByNode = workflowsStore.getWorkflowRunData ?? {};

		function setDirtiness(nodeName: string, value: CanvasNodeDirtiness) {
			dirtiness[nodeName] = dirtiness[nodeName] ?? value;

			const loop = findLoop(nodeName, new Set(), workflowsStore.incomingConnectionsByNodeName);

			if (!loop) {
				return;
			}

			const loopEntryNodeName = [...loop].sort(
				(a, b) => (depthByName.value[a] ?? 0) - (depthByName.value[b] ?? 0),
			)?.[0];

			if (loopEntryNodeName) {
				// If a node in a loop becomes dirty, the first node in the loop should also be dirty
				dirtiness[loopEntryNodeName] = dirtiness[loopEntryNodeName] ?? 'upstream-dirty';
			}
		}

		for (const [nodeName, runData] of Object.entries(runDataByNode)) {
			const runAt = runData[0]?.startTime ?? 0;

			if (!runAt) {
				continue;
			}

			const parameterUpdate = getParameterUpdateType(nodeName, runAt);

			if (parameterUpdate) {
				setDirtiness(nodeName, parameterUpdate);
				continue;
			}

			const connectionUpdate = getConnectionUpdateType(nodeName, runAt);

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
				setDirtiness(nodeName, 'pinned-data-updated');
				continue;
			}

			const pinnedDataLastRemovedAt = workflowsStore.getPinnedDataLastRemovedAt(nodeName) ?? 0;

			if (pinnedDataLastRemovedAt > runAt) {
				setDirtiness(nodeName, 'pinned-data-updated');
				continue;
			}
		}

		return dirtiness;
	});

	return { dirtinessByName };
}
