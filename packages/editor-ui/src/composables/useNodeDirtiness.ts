import {
	AddConnectionCommand,
	AddNodeCommand,
	BulkCommand,
	EnableNodeToggleCommand,
	RemoveConnectionCommand,
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
	getIncomingConnections: (nodeName: string) => INodeConnections,
	getOutgoingConnectors: (nodeName: string) => INodeConnections,
): boolean {
	if (command instanceof BulkCommand) {
		return command.commands.some((cmd) =>
			shouldCommandMarkDirty(cmd, nodeName, getIncomingConnections, getOutgoingConnectors),
		);
	}

	if (command instanceof AddConnectionCommand) {
		return command.connectionData[1]?.node === nodeName;
	}

	const incomingNodes = Object.values(getIncomingConnections(nodeName))
		.flat()
		.flat()
		.filter((connection) => connection !== null)
		.map((connection) => connection.node);

	if (command instanceof RemoveConnectionCommand) {
		const [from, to] = command.connectionData;

		return to.node === nodeName && !incomingNodes.includes(from.node);
	}

	if (command instanceof AddNodeCommand) {
		return incomingNodes.includes(command.node.name);
	}

	if (command instanceof EnableNodeToggleCommand) {
		return (
			incomingNodes.includes(command.nodeName) &&
			(command.newState ||
				Object.keys(getOutgoingConnectors(command.nodeName)).some(
					(type) => type !== NodeConnectionType.Main,
				))
		);
	}

	return false;
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

	const dirtinessByName = computed(() => {
		// Do not highlight dirtiness if new partial execution is not enabled
		if (settingsStore.partialExecutionVersion === 1) {
			return {};
		}

		const dirtiness: Record<string, CanvasNodeDirtiness | undefined> = {};
		const runDataByNode = workflowsStore.getWorkflowRunData ?? {};

		for (const [nodeName, runData] of Object.entries(runDataByNode)) {
			const runAt = runData[0].startTime ?? 0;

			if (!runAt) {
				continue;
			}

			const parameterUpdate = getParameterUpdateType(nodeName, runAt);

			if (parameterUpdate) {
				dirtiness[nodeName] = parameterUpdate;
				continue;
			}

			const connectionUpdate = getConnectionUpdateType(nodeName, runAt);

			if (connectionUpdate) {
				dirtiness[nodeName] = connectionUpdate;
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
				dirtiness[nodeName] = 'pinned-data-updated';
				continue;
			}

			const pinnedDataLastRemovedAt = workflowsStore.getPinnedDataLastRemovedAt(nodeName) ?? 0;

			if (pinnedDataLastRemovedAt > runAt) {
				dirtiness[nodeName] = 'pinned-data-updated';
				continue;
			}
		}

		return dirtiness;
	});

	return { dirtinessByName };
}
