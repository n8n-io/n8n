import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';

// Experiment cleanup: remove with emptyCanvasGroups (121_empty_canvas_groups).
export function countGroupExternalConnections(
	group: IWorkflowGroup,
	nodes: INode[],
	connectionsBySourceNode: IConnections,
): number {
	const memberIds = new Set(group.nodeIds);
	const memberNames = new Set(
		nodes.filter((node) => memberIds.has(node.id)).map((node) => node.name),
	);

	let count = 0;
	for (const [sourceName, connectionsByType] of Object.entries(connectionsBySourceNode)) {
		for (const connectionsByOutput of Object.values(connectionsByType)) {
			for (const connections of connectionsByOutput) {
				for (const connection of connections ?? []) {
					if (memberNames.has(sourceName) !== memberNames.has(connection.node)) {
						count++;
					}
				}
			}
		}
	}

	return count;
}
