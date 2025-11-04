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
export class WaitNodeSubworkflowRule implements IBreakingChangeWorkflowRule {
	id: string = 'wait-node-subworkflow-v2';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v2',
			title: 'Wait node behavior change in sub-workflows',
			description:
				'Wait nodes in sub-workflows now return data from the last node instead of the node before the wait node',
			category: BreakingChangeCategory.workflow,
			severity: 'high',
		};
	}

	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Review sub-workflow output handling',
				description:
					'Check workflows that use Execute Workflow node to call sub-workflows containing Wait nodes. The output data structure may have changed.',
			},
			{
				action: 'Update downstream logic',
				description:
					'Adjust any logic in parent workflows that depends on the data returned from sub-workflows with Wait nodes, as it now returns the last node data instead of the node before the wait node.',
			},
			{
				action: 'Test affected workflows',
				description:
					'Test all workflows with Execute Workflow nodes calling sub-workflows that contain Wait nodes to ensure the new behavior works as expected.',
			},
		];
	}

	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		// Check if the workflow contains Wait nodes
		const waitNodes = nodesGroupedByType.get('n8n-nodes-base.wait') ?? [];

		if (waitNodes.length === 0) {
			return { isAffected: false, issues: [] };
		}

		// Check if this workflow IS a subworkflow by looking for Execute Workflow Trigger
		const executeWorkflowTriggerNodes =
			nodesGroupedByType.get('n8n-nodes-base.executeWorkflowTrigger') ?? [];

		if (executeWorkflowTriggerNodes.length === 0) {
			return { isAffected: false, issues: [] };
		}

		// This workflow is a subworkflow (has Execute Workflow Trigger) and contains Wait nodes
		// The output behavior has changed

		return {
			isAffected: true,
			issues: [
				{
					title: 'Sub-workflow with Wait nodes has changed output behavior',
					description:
						'This workflow is a sub-workflow (contains Execute Workflow Trigger) with Wait nodes. The data returned from Wait nodes in sub-workflows has changed. Previously, Wait nodes returned data from the node before the wait node. Now they return data from the last node in the workflow.',
					level: 'warning',
				},
			],
		};
	}
}
