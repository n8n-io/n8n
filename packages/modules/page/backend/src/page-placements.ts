import { readShownPageId, type PageWorkflowPlacement } from '@n8n/api-types';

import type { WorkflowNodesRow } from './page-workflow.repository';

const STICKY_NOTE_NODE_TYPE = 'n8n-nodes-base.stickyNote';

type WorkflowNode = WorkflowNodesRow['nodes'][number];

/** A sticky note shows a page when its content is only the address of that page. */
function showsPage(node: WorkflowNode, pageId: string): boolean {
	const content = node.parameters?.content;
	return (
		node.type === STICKY_NOTE_NODE_TYPE &&
		typeof content === 'string' &&
		readShownPageId(content) === pageId
	);
}

/** Lists the sticky notes of the workflows that show the page. */
export function toWorkflowPlacements(
	workflows: WorkflowNodesRow[],
	pageId: string,
): PageWorkflowPlacement[] {
	return workflows.flatMap((workflow) =>
		workflow.nodes
			.filter((node) => showsPage(node, pageId))
			.map((node) => ({
				workflowId: workflow.id,
				workflowName: workflow.name,
				nodeId: node.id,
				nodeName: node.name,
			})),
	);
}
