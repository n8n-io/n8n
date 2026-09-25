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

@BreakingChangeRule({ version: 'v3' })
export class RemovedNodesV3Rule implements IBreakingChangeWorkflowRule {
	private readonly removedNodes = [
		'@n8n/n8n-nodes-langchain.documentGithubLoader',
		'@n8n/n8n-nodes-langchain.memoryMotorhead',
		'n8n-nodes-base.orbit',
		'@n8n/n8n-nodes-langchain.memoryZep',
		'@n8n/n8n-nodes-langchain.vectorStoreZep',
		'@n8n/n8n-nodes-langchain.vectorStoreZepInsert',
		'@n8n/n8n-nodes-langchain.vectorStoreZepLoad',
	];

	id: string = 'removed-nodes-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Removed nodes',
			description: 'Several nodes have been removed and will no longer work',
			category: BreakingChangeCategory.workflow,
			severity: 'low',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
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
		const removedNodes = this.removedNodes.flatMap((type) => nodesGroupedByType.get(type) ?? []);
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
