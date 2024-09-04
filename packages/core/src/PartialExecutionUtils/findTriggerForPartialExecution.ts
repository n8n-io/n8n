import type { INode, Workflow } from 'n8n-workflow';

function findAllParentTriggers(workflow: Workflow, destinationNode: string) {
	const parentNodes = workflow
		.getParentNodes(destinationNode)
		.map((name) => {
			const node = workflow.getNode(name);

			if (!node) {
				return null;
			}

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
export function findTriggerForPartialExecution(
	workflow: Workflow,
	destinationNode: string,
): INode | undefined {
	const parentTriggers = findAllParentTriggers(workflow, destinationNode).filter(
		(trigger) => !trigger.disabled,
	);
	const pinnedTriggers = parentTriggers
		// TODO: add the other filters here from `findAllPinnedActivators`, see
		// copy below.
		.filter((trigger) => workflow.pinData?.[trigger.name])
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
