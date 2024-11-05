import * as assert from 'assert/strict';
import type { INode, Workflow } from 'n8n-workflow';

function findAllParentTriggers(workflow: Workflow, destinationNodeName: string) {
	const parentNodes = workflow
		.getParentNodes(destinationNodeName)
		.map((name) => {
			const node = workflow.getNode(name);

			// We got the node name from `workflow.getParentNodes`. The node must
			// exist.
			assert.ok(node);

			return {
				node,
				nodeType: workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion),
			};
		})
		.filter((value) => value !== null)
		.filter(({ nodeType }) => nodeType.description.group.includes('trigger'))
		.map(({ node }) => node);

	return parentNodes;
}

// TODO: write unit tests for this
// TODO: rewrite this using DirectedGraph instead of workflow.
export function findTriggerForPartialExecution(
	workflow: Workflow,
	destinationNodeName: string,
): INode | undefined {
	const parentTriggers = findAllParentTriggers(workflow, destinationNodeName).filter(
		(trigger) => !trigger.disabled,
	);
	const pinnedTriggers = parentTriggers
		// TODO: add the other filters here from `findAllPinnedActivators`, see
		// copy below.
		.filter((trigger) => workflow.pinData?.[trigger.name])
		// TODO: Make this sorting more predictable
		// Put nodes which names end with 'webhook' first, while also reversing the
		// order they had in the original array.
		.sort((n) => (n.type.endsWith('webhook') ? -1 : 1));

	if (pinnedTriggers.length) {
		return pinnedTriggers[0];
	} else {
		return parentTriggers[0];
	}
}

//function findAllPinnedActivators(workflow: Workflow, pinData?: IPinData) {
//	return Object.values(workflow.nodes)
//		.filter(
//			(node) =>
//				!node.disabled &&
//				pinData?.[node.name] &&
//				['trigger', 'webhook'].some((suffix) => node.type.toLowerCase().endsWith(suffix)) &&
//				node.type !== 'n8n-nodes-base.respondToWebhook',
//		)
//		.sort((a) => (a.type.endsWith('webhook') ? -1 : 1));
//}
