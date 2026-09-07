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

const EXECUTE_WORKFLOW_NODE_TYPE = 'n8n-nodes-base.executeWorkflow';

@BreakingChangeRule({ version: 'v3' })
export class ExecuteWorkflowEachModeRule implements IBreakingChangeWorkflowRule {
	id = 'execute-workflow-each-mode-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Execute Sub-workflow "Run once for each item" mode removed',
			description:
				'The "Run once for each item" mode of the Execute Sub-workflow node is being removed. Use a Loop Over Items node before the node in "Run once with all items" mode instead.',
			category: BreakingChangeCategory.workflow,
			severity: 'medium',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Replace with a Loop Over Items node',
				description:
					'Add a Loop Over Items node before the flagged Execute Sub-workflow node and set its mode to "Run once with all items" to keep running the sub-workflow once per item.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = (nodesGroupedByType.get(EXECUTE_WORKFLOW_NODE_TYPE) ?? []).filter(
			(node) => node.parameters.mode === 'each',
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses the removed "Run once for each item" mode`,
				description:
					'The "Run once for each item" mode is being removed. Add a Loop Over Items node before this node and switch it to "Run once with all items" to keep running the sub-workflow once per item.',
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
