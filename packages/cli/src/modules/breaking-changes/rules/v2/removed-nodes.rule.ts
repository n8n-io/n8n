import { Service } from '@n8n/di';

import type { DetectionResult, BreakingChangeMetadata, CommonDetectionInput } from '../../types';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../types';
import { AbstractBreakingChangeRule } from '../abstract-rule';

@Service()
export class RemovedNodesRule extends AbstractBreakingChangeRule {
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
			category: BreakingChangeCategory.WORKFLOW,
			severity: BreakingChangeSeverity.CRITICAL,
		};
	}

	async detect({ workflows }: CommonDetectionInput): Promise<DetectionResult> {
		const result = this.createEmptyResult();

		try {
			for (const workflow of workflows) {
				const removedNodes = workflow.nodes.filter((n) => this.REMOVED_NODES.includes(n.type));
				if (removedNodes.length === 0) continue;

				result.affectedWorkflows.push({
					id: workflow.id,
					name: workflow.name,
					active: workflow.active,
					issues: removedNodes.map((node) => ({
						title: `Node '${node.type}' has been removed`,
						description: `The node type '${node.type}' is no longer available. Please replace it with an alternative.`,
						level: IssueLevel.ERROR,
					})),
				});
			}

			if (result.affectedWorkflows.length > 0) {
				result.isAffected = true;
				result.recommendations.push({
					action: 'Update affected workflows',
					description: 'Replace removed nodes with their updated versions or alternatives',
					documentationUrl: this.getMetadata().documentationUrl,
				});
			}
		} catch (error) {
			this.logger.error('Failed to detect removed nodes', { error });
		}

		return result;
	}
}
