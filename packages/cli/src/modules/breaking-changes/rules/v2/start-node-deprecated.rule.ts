import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

@Service()
export class StartNodeDeprecatedRule implements IBreakingChangeWorkflowRule {
	private readonly START_NODE_TYPE = 'n8n-nodes-base.start';

	id: string = 'start-node-deprecated-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Start node is deprecated',
			description:
				'The Start node has been deprecated. Replace it with a Manual Trigger for manual executions, or with an Execute Workflow Trigger if used as a sub-workflow.',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Replace with Manual Trigger',
				description:
					'If the workflow is triggered manually, replace the Start node with the Manual Trigger node.',
			},
			{
				action: 'Replace with Execute Workflow Trigger',
				description:
					'If the workflow is called as a sub-workflow, replace the Start node with the Execute Workflow Trigger node and activate the workflow.',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const startNodes = nodesGroupedByType.get(this.START_NODE_TYPE) ?? [];
		const enabledStartNodes = startNodes.filter((node) => !node.disabled);

		if (enabledStartNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: enabledStartNodes.map((node) => ({
				title: `Start node '${node.name}' is deprecated`,
				description:
					'Replace with Manual Trigger for manual executions, or Execute Workflow Trigger if used as a sub-workflow.',
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
