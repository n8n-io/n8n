import type { IConnections, INode, IWorkflowGroup } from 'n8n-workflow';
import {
	formatTopLevelItemsMessage,
	summarizeTopLevelItems,
	TOP_LEVEL_ITEMS_OVER_CEILING_CODE,
} from 'n8n-workflow';

export type TopLevelItemsWarning = { code: string; message: string };

type CanvasShape = {
	nodes: INode[];
	connections: IConnections;
	nodeGroups?: IWorkflowGroup[];
};

const summarize = (workflow: CanvasShape) =>
	summarizeTopLevelItems({
		nodes: workflow.nodes,
		nodeGroups: workflow.nodeGroups,
		connectionsBySourceNode: workflow.connections,
	});

/** Names of the nodes that draw a box of their own: not in a group, not a sub-node. */
export function summarizeUngroupedNodeNames(workflow: CanvasShape): string[] {
	return summarize(workflow).ungroupedNodeNames;
}

/**
 * One warning when the saved canvas shows more boxes than the ceiling. A box is a
 * node or a collapsed group. Returns nothing when the canvas is within the ceiling.
 */
export function topLevelItemsWarning(workflow: CanvasShape): TopLevelItemsWarning | undefined {
	const summary = summarize(workflow);

	if (!summary.overCeiling) {
		return undefined;
	}

	return {
		code: TOP_LEVEL_ITEMS_OVER_CEILING_CODE,
		message: formatTopLevelItemsMessage(summary),
	};
}
