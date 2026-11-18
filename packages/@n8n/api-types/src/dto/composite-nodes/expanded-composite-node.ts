import type { IConnections, INode } from 'n8n-workflow';

/** The inner workflow of a composite node, as the user sees it when looking inside the node. */
export interface ExpandedCompositeNode {
	nodes: INode[];
	connections: IConnections;
}
