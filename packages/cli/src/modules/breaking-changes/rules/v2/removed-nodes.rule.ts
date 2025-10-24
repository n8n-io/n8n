import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type {
	BreakingChangeMetadata,
	WorkflowDetectionResult,
	Recommendation,
	IBreakingChangeWorkflowRule,
} from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';

@Service()
export class RemovedNodesRule implements IBreakingChangeWorkflowRule {
	private readonly REMOVED_NODES = [
		'n8n-nodes-base.spontit',
		'n8n-nodes-base.crowdDev',
		'n8n-nodes-base.kitemaker',
	];

	getMetadata(): BreakingChangeMetadata {
		return {
			id: 'removed-nodes-v2',
			version: 'v2',
			title: 'Removed Deprecated Nodes',
			description: 'Several deprecated nodes have been removed and will no longer work',
			category: BreakingChangeCategory.workflow,
			severity: BreakingChangeSeverity.critical,
		};
	}

	async getRecommendations(): Promise<Recommendation[]> {
		return [
			{
				action: 'Update affected workflows',
				description: 'Replace removed nodes with their updated versions or alternatives',
				documentationUrl: this.getMetadata().documentationUrl,
			},
		];
	}

	async detectWorkflow(workflow: WorkflowEntity): Promise<WorkflowDetectionResult> {
		const removedNodes = workflow.nodes.filter((n) => this.REMOVED_NODES.includes(n.type));
		if (removedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: removedNodes.map((node) => ({
				title: `Node '${node.type}' with name '${node.name}' has been removed`,
				description: `The node type '${node.type}' is no longer available. Please replace it with an alternative.`,
				level: IssueLevel.error,
			})),
		};
	}
}
