import * as assert from 'assert/strict';
import type { INode, INodeType, IRunData, Workflow } from 'n8n-workflow';

const isTriggerNode = (nodeType: INodeType) => nodeType.description.group.includes('trigger');

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
		.filter(({ nodeType }) => isTriggerNode(nodeType))
		.map(({ node }) => node);

	return parentNodes;
}

// TODO: rewrite this using DirectedGraph instead of workflow.
export function findTriggerForPartialExecution(
	workflow: Workflow,
	destinationNodeName: string,
	runData: IRunData,
): INode | undefined {
	// First, check if the destination node itself is a trigger
	const destinationNode = workflow.getNode(destinationNodeName);
	if (!destinationNode) return;

	const destinationNodeType = workflow.nodeTypes.getByNameAndVersion(
		destinationNode.type,
		destinationNode.typeVersion,
	);

	if (isTriggerNode(destinationNodeType) && !destinationNode.disabled) {
		return destinationNode;
	}

	// Since the destination node wasn't a trigger, we try to find a parent node that's a trigger
	const parentTriggers = findAllParentTriggers(workflow, destinationNodeName).filter(
		(trigger) => !trigger.disabled,
	);

	// prefer triggers that have run data
	for (const trigger of parentTriggers) {
		if (runData[trigger.name]) {
			return trigger;
		}
	}

	// Prioritize webhook triggers with pinned-data
	const pinnedTriggers = parentTriggers
		// TODO: add the other filters here from `findAllPinnedActivators`, see
		// copy below.
		.filter((trigger) => workflow.pinData?.[trigger.name])
		// Put nodes which names end with 'webhook' first, while also reversing the
		// order they had in the original array.
		.sort((a, b) => (a.type.endsWith('webhook') ? -1 : b.type.endsWith('webhook') ? 1 : 0));
	if (pinnedTriggers.length) {
		return pinnedTriggers[0];
	}

	// Prioritize webhook triggers over other parent triggers
	const webhookTriggers = parentTriggers.filter((trigger) => trigger.type.endsWith('webhook'));
	return webhookTriggers.length > 0 ? webhookTriggers[0] : parentTriggers[0];
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
