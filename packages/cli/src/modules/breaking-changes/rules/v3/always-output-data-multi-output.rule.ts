import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { NodeTypesProxy } from '@n8n/backend-services';

import { reportAffectedNodes } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class AlwaysOutputDataMultiOutputRule implements IBreakingChangeWorkflowRule {
	id = 'always-output-data-multi-output-v3';

	constructor(private readonly nodeTypes: NodeTypesProxy) {}

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: '"Always Output Data" behavior fix on nodes with multiple outputs',
			description:
				'On nodes with multiple outputs, "Always Output Data" currently adds an empty item to the first output even when another output produced data, which misroutes items. n8n 3.0 fixes this: it adds the empty item only when every output is empty. Check the nodes connected to the first output of each affected node, and change them if they rely on the empty item.',
			category: BreakingChangeCategory.workflow,
			impact: 'behaviorChanges',
			assistant: 'review',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Update logic that relies on the "Always Output Data" empty item',
				description:
					'For each affected node, check the nodes connected to its first output. If they run on the empty item while another output has data, change them so they do not depend on it. After the update, the node sends the empty item only when every output is empty.',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes: INode[] = [];
		for (const nodes of nodesGroupedByType.values()) {
			for (const node of nodes) {
				if (node.alwaysOutputData === true && this.hasMultipleMainOutputs(node)) {
					affectedNodes.push(node);
				}
			}
		}

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses "Always Output Data" and has multiple outputs`,
			description:
				'"Always Output Data" currently adds an empty item to this node\'s first output even when another output has data. n8n 3.0 fixes this: it adds the empty item only when every output is empty, so this node\'s output changes. Check the nodes connected to its first output, and change them if they rely on the empty item.',
			level: 'warning',
		}));
	}

	/**
	 * Whether the node can route items to more than one main output at runtime.
	 * Resolved from the installed node description instead of a fixed list of
	 * node types, so community nodes are covered too.
	 */
	private hasMultipleMainOutputs(node: INode): boolean {
		// An error output occupies an additional main output slot at runtime
		if (node.onError === 'continueErrorOutput') return true;

		let outputs: INodeTypeDescription['outputs'];
		try {
			outputs = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description.outputs;
		} catch {
			// Node type not installed (e.g. removed community package), cannot assess
			return false;
		}

		// Expression-valued outputs depend on node parameters (e.g. Switch); some
		// configs are single-output, but flagging those is harmless
		if (!Array.isArray(outputs)) return true;

		const mainOutputCount = outputs.filter(
			(output) => (typeof output === 'string' ? output : output.type) === NodeConnectionTypes.Main,
		).length;

		return mainOutputCount > 1;
	}
}
