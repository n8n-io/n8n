import {
	AddConnectionCommand,
	AddNodeCommand,
	BulkCommand,
	EnableNodeToggleCommand,
	RemoveNodeCommand,
	type Undoable,
} from '@/models/history';
import { useHistoryStore } from '@/stores/history.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type CanvasNodeDirtiness } from '@/types';
import { type ITaskData, type INodeConnections, NodeConnectionType } from 'n8n-workflow';
import { computed } from 'vue';

function markDownstreamDirtyRecursively(
	nodeName: string,
	dirtiness: Record<string, CanvasNodeDirtiness | undefined>,
	visitedNodes: Set<string>,
	runDataByNode: Record<string, ITaskData[]>,
	getOutgoingConnections: (nodeName: string) => INodeConnections,
): void {
	if (visitedNodes.has(nodeName)) {
		return; // prevent infinite recursion
	}

	visitedNodes.add(nodeName);

	for (const [type, inputConnections] of Object.entries(getOutgoingConnections(nodeName))) {
		if ((type as NodeConnectionType) !== NodeConnectionType.Main) {
			continue;
		}

		for (const connections of inputConnections) {
			for (const { node } of connections ?? []) {
				const hasRunData = (runDataByNode[node] ?? []).length > 0;

				if (!hasRunData || dirtiness[node] !== undefined) {
					continue;
				}

				dirtiness[node] = 'upstream-dirty';

				markDownstreamDirtyRecursively(
					node,
					dirtiness,
					visitedNodes,
					runDataByNode,
					getOutgoingConnections,
				);
			}
		}
	}
}

/**
 * Does the command make the given node dirty?
 */
function shouldMarkDirty(
	command: Undoable,
	nodeName: string,
	nodeLastRanAt: number,
	getIncomingConnections: (nodeName: string) => INodeConnections,
): boolean {
	if (nodeLastRanAt > command.getTimestamp()) {
		return false;
	}

	if (command instanceof BulkCommand) {
		return command.commands.some((cmd) =>
			shouldMarkDirty(cmd, nodeName, nodeLastRanAt, getIncomingConnections),
		);
	}

	if (command instanceof AddConnectionCommand) {
		return command.connectionData[1]?.node === nodeName;
	}

	if (
		command instanceof RemoveNodeCommand ||
		command instanceof AddNodeCommand ||
		command instanceof EnableNodeToggleCommand
	) {
		const commandTargetNodeName =
			command instanceof RemoveNodeCommand || command instanceof AddNodeCommand
				? command.node.name
				: command.nodeName;

		return Object.entries(getIncomingConnections(nodeName)).some(([type, nodeInputConnections]) => {
			switch (type as NodeConnectionType) {
				case NodeConnectionType.Main:
					return nodeInputConnections.some((connections) =>
						connections?.some((connection) => connection.node === commandTargetNodeName),
					);
				default:
					return false;
			}
		});
	}

	return false;
}

/**
 * Determines the subgraph that is affected by the change made after the last execution
 */
export function useNodeDirtiness() {
	const historyStore = useHistoryStore();
	const workflowsStore = useWorkflowsStore();
	const settingsStore = useSettingsStore();

	const dirtinessByName = computed(() => {
		// Do not highlight dirtiness if new partial execution is not enabled
		if (settingsStore.partialExecutionVersion === 1) {
			return {};
		}

		const dirtiness: Record<string, CanvasNodeDirtiness | undefined> = {};
		const visitedNodes: Set<string> = new Set();
		const runDataByNode = workflowsStore.getWorkflowRunData ?? {};

		function markDownstreamDirty(nodeName: string) {
			markDownstreamDirtyRecursively(
				nodeName,
				dirtiness,
				visitedNodes,
				runDataByNode,
				workflowsStore.outgoingConnectionsByNodeName,
			);
		}

		for (const node of workflowsStore.allNodes) {
			const nodeName = node.name;
			const runAt = runDataByNode[nodeName]?.[0]?.startTime ?? 0;

			if (!runAt) {
				continue;
			}

			const parametersLastUpdate = workflowsStore.getParametersLastUpdate(nodeName) ?? 0;

			if (parametersLastUpdate > runAt) {
				dirtiness[nodeName] = 'parameters-updated';
				markDownstreamDirty(nodeName);
				continue;
			}

			if (
				runAt &&
				historyStore.undoStack.some((command) =>
					shouldMarkDirty(command, nodeName, runAt, workflowsStore.incomingConnectionsByNodeName),
				)
			) {
				dirtiness[nodeName] = 'incoming-connections-updated';
				markDownstreamDirty(nodeName);
				continue;
			}

			const pinnedDataUpdatedAt = workflowsStore.getPinnedDataLastUpdate(nodeName) ?? 0;

			if (pinnedDataUpdatedAt > runAt) {
				dirtiness[nodeName] = 'pinned-data-updated';
				markDownstreamDirty(nodeName);
				continue;
			}
		}

		return dirtiness;
	});

	return { dirtinessByName };
}
