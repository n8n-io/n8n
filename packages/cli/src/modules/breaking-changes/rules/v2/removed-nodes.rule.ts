import { BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { INode } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class RemovedNodesRule implements IBreakingChangeWorkflowRule {
	private readonly REMOVED_NODES = [
		'n8n-nodes-base.spontit',
		'n8n-nodes-base.crowdDev',
		'n8n-nodes-base.kitemaker',
	];

	id: string = 'removed-nodes-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Removed Deprecated Nodes',
			description: 'Several deprecated nodes have been removed and will no longer work',
			category: BreakingChangeCategory.workflow,
			severity: 'low',
		};
	}

	async getRecommendations(): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Update affected workflows',
				description: 'Replace removed nodes with their updated versions or alternatives',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const removedNodes = this.REMOVED_NODES.flatMap((type) => nodesGroupedByType.get(type) ?? []);
		if (removedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: removedNodes.map((node) => ({
				title: `Node '${node.type}' with name '${node.name}' has been removed`,
				description: `The node type '${node.type}' is no longer available. Please replace it with an alternative.`,
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
