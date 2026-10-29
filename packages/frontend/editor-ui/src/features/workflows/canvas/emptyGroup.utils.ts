import type { WorkflowDataUpdate } from '@n8n/rest-api-client/api/workflows';
import {
	getEmptyGroupAnchor,
	type IConnection,
	type IConnections,
	type INode,
	type NodeInputConnections,
} from 'n8n-workflow';

/**
 * Builds the connection graph for visible nodes, reconnecting visible endpoints through hidden nodes.
 */
export function mapConnectionsToVisibleNodes(
	connections: IConnections,
	visibleNodes: ReadonlyArray<Pick<INode, 'name'>>,
): IConnections {
	const visibleNodeNames = new Set(visibleNodes.map((node) => node.name));
	const visibleConnections: IConnections = {};

	const addVisibleConnection = (
		sourceName: string,
		sourceType: string,
		sourceIndex: number,
		target: IConnection,
	) => {
		const sourceConnections = (visibleConnections[sourceName] ??= {});
		const typeConnections = (sourceConnections[sourceType] ??= []);
		const outputConnections = (typeConnections[sourceIndex] ??= []);

		if (
			!outputConnections.some(
				(connection) =>
					connection.node === target.node &&
					connection.type === target.type &&
					connection.index === target.index,
			)
		) {
			outputConnections.push(target);
		}
	};

	const addConnectionsToVisibleNodes = (
		sourceName: string,
		sourceType: string,
		sourceIndex: number,
		target: IConnection,
		visitedHiddenNodes: Set<string>,
	) => {
		if (visibleNodeNames.has(target.node)) {
			if (visitedHiddenNodes.size > 0 && target.node === sourceName) return;
			addVisibleConnection(sourceName, sourceType, sourceIndex, target);
			return;
		}

		if (visitedHiddenNodes.has(target.node)) return;

		const nextVisitedHiddenNodes = new Set(visitedHiddenNodes).add(target.node);
		const hiddenNodeConnections = connections[target.node]?.[target.type] ?? [];
		for (const outputConnections of hiddenNodeConnections) {
			for (const nextTarget of outputConnections ?? []) {
				addConnectionsToVisibleNodes(
					sourceName,
					sourceType,
					sourceIndex,
					nextTarget,
					nextVisitedHiddenNodes,
				);
			}
		}
	};

	for (const [sourceName, sourceConnections] of Object.entries(connections)) {
		if (!visibleNodeNames.has(sourceName)) continue;

		for (const [sourceType, typeConnections] of Object.entries(sourceConnections) as Array<
			[string, NodeInputConnections]
		>) {
			for (const [sourceIndex, outputConnections] of typeConnections.entries()) {
				for (const target of outputConnections ?? []) {
					addConnectionsToVisibleNodes(sourceName, sourceType, sourceIndex, target, new Set());
				}
			}
		}
	}

	return visibleConnections;
}

/**
 * Removes empty canvas groups from workflow data crossing a transfer boundary.
 *
 * Empty-group anchors are implementation nodes. Once they are removed, paths
 * through those anchors must be projected back to their visible endpoints so
 * copied or exported workflows do not retain broken connections.
 */
export function removeEmptyCanvasGroupsFromWorkflowData(
	workflowData: WorkflowDataUpdate,
	anchorSourceNodes: INode[] = workflowData.nodes ?? [],
) {
	const nodes = workflowData.nodes ?? [];
	const emptyGroupAnchorIds = new Set<string>();
	const emptyGroupAnchorNames = new Set<string>();

	for (const group of workflowData.nodeGroups ?? []) {
		const anchor = getEmptyGroupAnchor(group, anchorSourceNodes);
		if (!anchor) continue;

		emptyGroupAnchorIds.add(anchor.id);
		emptyGroupAnchorNames.add(anchor.name);
	}

	if (emptyGroupAnchorIds.size === 0) return;

	workflowData.nodes = nodes.filter((node) => !emptyGroupAnchorIds.has(node.id));
	workflowData.nodeGroups = workflowData.nodeGroups?.filter(
		(group) => getEmptyGroupAnchor(group, anchorSourceNodes) === undefined,
	);

	if (workflowData.nodeGroups?.length === 0) {
		workflowData.nodeGroups = undefined;
	}

	if (workflowData.pinData) {
		for (const anchorName of emptyGroupAnchorNames) {
			delete workflowData.pinData[anchorName];
		}
	}

	if (workflowData.connections) {
		workflowData.connections = mapConnectionsToVisibleNodes(
			workflowData.connections,
			workflowData.nodes,
		);
	}
}
