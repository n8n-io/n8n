import { WorkflowOperationError } from 'n8n-workflow';
import type { IPinData, INode, Workflow } from 'n8n-workflow';
import { Service as Utility } from 'typedi';
import { STARTING_NODES_IN_ORDER } from '@/constants';

@Utility()
export class WorkflowUtility {
	/**
	 * Find the node to start a `cli` or `integrated` workflow execution from.
	 */
	findStartingNode(nodes: INode[], executionMode: 'cli' | 'integrated') {
		const found = nodes.find((n) => STARTING_NODES_IN_ORDER.includes(n.type));

		if (found) return found;

		const startingNodesToDisplay = STARTING_NODES_IN_ORDER.join(', ');

		throw new WorkflowOperationError(
			`Missing node to start execution on \`${executionMode}\` mode`,
			undefined,
			`Please make sure the workflow you're calling contains at least one of the following nodes: ${startingNodesToDisplay}`,
		);
	}

	/**
	 * Find the pinned trigger to start a `manual` workflow execution from.
	 */
	findStartingPinnedTrigger(
		workflow: Workflow,
		nodes: INode[],
		pinData: IPinData,
		startNodeNames: string[],
	) {
		const isFullExecution = startNodeNames?.length === 0;

		const allPinnedTriggers = this.findAllPinnedTriggers(nodes, pinData);

		return isFullExecution
			? this.inFullExecution(allPinnedTriggers)
			: this.inPartialExecution(allPinnedTriggers, workflow, startNodeNames);
	}

	/**
	 * Find all pinned triggers in a workflow.
	 */
	private findAllPinnedTriggers(nodes: INode[], pinData: IPinData) {
		const isTrigger = (nodeTypeName: string) =>
			['trigger', 'webhook'].some((suffix) => nodeTypeName.toLowerCase().includes(suffix));

		return nodes.filter((n) => !n.disabled && pinData[n.name] && isTrigger(n.type));
	}

	/**
	 * Find the starting pinned trigger in a full `manual` execution.
	 */
	private inFullExecution(allPinnedTriggers: INode[]) {
		// @TODO: Do not simply pick zeroth element
		return allPinnedTriggers[0];
	}

	/**
	 * Find the starting pinned trigger in a partial `manual` execution.
	 */
	private inPartialExecution(
		allPinnedTriggers: INode[],
		workflow: Workflow,
		startNodeNames: string[],
	) {
		// @TODO: When can startNodeNames be more than one in a partial manual execution?
		const [startNodeName] = startNodeNames;

		const parentNodeNames = workflow.getParentNodes(startNodeName);

		if (parentNodeNames.length === 0) {
			return allPinnedTriggers.find((pt) => pt.name === startNodeName) ?? null;
		}

		// @TODO: Do not simply pick zeroth element
		const parentNodeName = parentNodeNames.find((p) => p === allPinnedTriggers[0].name);

		return allPinnedTriggers.find((pt) => pt.name === parentNodeName) ?? null;
	}
}
