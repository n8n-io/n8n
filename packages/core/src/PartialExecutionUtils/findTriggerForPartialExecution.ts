import type { INode, Workflow } from 'n8n-workflow';

function findAllParentTriggers(workflow: Workflow, destinationNode: string) {
	// Traverse from the destination node back until we found all trigger nodes.
	// Do this recursively, because why not.
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
		// TODO: add the other filters here from `findAllPinnedActivators`
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

// TODO: deduplicate this with
// packages/cli/src/workflows/workflowExecution.service.ts
//function selectPinnedActivatorStarter(
//	workflow: Workflow,
//	startNodes?: string[],
//	pinData?: IPinData,
//) {
//	if (!pinData || !startNodes) return null;
//
//	const allPinnedActivators = findAllPinnedActivators(workflow, pinData);
//
//	if (allPinnedActivators.length === 0) return null;
//
//	const [firstPinnedActivator] = allPinnedActivators;
//
//	// full manual execution
//
//	if (startNodes?.length === 0) return firstPinnedActivator ?? null;
//
//	// partial manual execution
//
//	/**
//	 * If the partial manual execution has 2+ start nodes, we search only the zeroth
//	 * start node's parents for a pinned activator. If we had 2+ start nodes without
//	 * a common ancestor and so if we end up finding multiple pinned activators, we
//	 * would still need to return one to comply with existing usage.
//	 */
//	const [firstStartNodeName] = startNodes;
//
//	const parentNodeNames =
//		//new Workflow({
//		//		nodes: workflow.nodes,
//		//		connections: workflow.connections,
//		//		active: workflow.active,
//		//		nodeTypes: this.nodeTypes,
//		//	}).
//		workflow.getParentNodes(firstStartNodeName);
//
//	if (parentNodeNames.length > 0) {
//		const parentNodeName = parentNodeNames.find((p) => p === firstPinnedActivator.name);
//
//		return allPinnedActivators.find((pa) => pa.name === parentNodeName) ?? null;
//	}
//
//	return allPinnedActivators.find((pa) => pa.name === firstStartNodeName) ?? null;
//}
