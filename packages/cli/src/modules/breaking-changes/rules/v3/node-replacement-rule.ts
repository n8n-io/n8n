import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

type NodeReplacement = {
	id: string;
	removedNodeName: string;
	removedNodeType: string;
	recommendations: BreakingChangeRecommendation[];
};

/** Creates and registers a v3 rule that flags every node of one removed node type. */
export function createNodeReplacementRule({
	id,
	removedNodeName,
	removedNodeType,
	recommendations,
}: NodeReplacement) {
	@BreakingChangeRule({ version: 'v3' })
	class NodeReplacementRule implements IBreakingChangeWorkflowRule {
		id = `${id}-v3`;

		getMetadata(): BreakingChangeRuleMetadata {
			return {
				version: 'v3',
				title: `${removedNodeName} node removed`,
				description: `The ${removedNodeName} node is no longer supported. ${recommendations.map(({ description }) => description).join(' ')}`,
				category: BreakingChangeCategory.workflow,
				impact: 'executionsFail',
			};
		}

		async getRecommendations(
			_workflowResults: BreakingChangeAffectedWorkflow[],
		): Promise<BreakingChangeRecommendation[]> {
			await Promise.resolve();
			return recommendations;
		}

		async detectWorkflow(
			_workflow: WorkflowEntity,
			nodesGroupedByType: Map<string, INode[]>,
		): Promise<WorkflowDetectionReport> {
			const removedNodes = nodesGroupedByType.get(removedNodeType) ?? [];
			if (removedNodes.length === 0) return { isAffected: false, issues: [] };

			await Promise.resolve();
			return {
				isAffected: true,
				issues: removedNodes.map((node) => ({
					title: `${removedNodeName} node '${node.name}' is no longer supported`,
					description: recommendations
						.map((recommendation) => recommendation.description)
						.join(' '),
					level: 'error',
					nodeId: node.id,
					nodeName: node.name,
				})),
			};
		}
	}

	return NodeReplacementRule;
}
