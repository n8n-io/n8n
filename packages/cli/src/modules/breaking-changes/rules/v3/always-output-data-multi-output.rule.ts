import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@BreakingChangeRule({ version: 'v3' })
export class AlwaysOutputDataMultiOutputRule implements IBreakingChangeWorkflowRule {
	id = 'always-output-data-multi-output-v3';

	constructor(private readonly nodeTypes: NodeTypes) {}

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: '"Always Output Data" behavior fix on nodes with multiple outputs',
			description:
				'On nodes with multiple outputs, "Always Output Data" currently adds an empty item to the first output even when another output produced data, which misroutes items. A future version fixes this so the empty item is only added when every output is empty. Workflows relying on the current behavior will produce different output.',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Review nodes using "Always Output Data" with multiple outputs',
				description:
					'After the fix, these nodes will no longer add an empty item to the first output when another output has data. Update any downstream logic that relies on that empty first-output item (for example a branch off the first output that runs on the empty case).',
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

		if (affectedNodes.length === 0) {
			return { isAffected: false, issues: [] };
		}

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses "Always Output Data" and has multiple outputs`,
				description:
					'"Always Output Data" currently adds an empty item to this node\'s first output even when another output has data. A future version fixes this to only add the empty item when every output is empty, so this node\'s output will change. Review any logic downstream of its first output.',
				level: 'warning',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
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
