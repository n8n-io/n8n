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
const REMOVED_SOURCES = ['localFile', 'url'];

const SOURCE_LABELS: Record<string, string> = {
	localFile: 'Local File',
	url: 'URL',
};

@BreakingChangeRule({ version: 'v3' })
export class ExecuteWorkflowSourceModesRule implements IBreakingChangeWorkflowRule {
	id = 'execute-workflow-source-modes-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Execute Sub-workflow "Local File" and "URL" sources removed',
			description:
				'The "Local File" and "URL" sources of the Execute Sub-workflow node are being removed. Sub-workflows must be loaded from the database or defined in the node parameters.',
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
				action: 'Switch to the "Database" source',
				description:
					'Import the referenced workflow into this n8n instance and select it via the "Database" source on the flagged Execute Sub-workflow node.',
			},
			{
				action: 'Or define the workflow JSON in the node',
				description:
					'Paste the referenced workflow\'s JSON into the "Parameter" source to keep the sub-workflow definition inside the node.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = (nodesGroupedByType.get(EXECUTE_WORKFLOW_NODE_TYPE) ?? []).filter(
			(node) => REMOVED_SOURCES.includes(node.parameters.source as string),
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses the removed "${SOURCE_LABELS[node.parameters.source as string]}" source`,
				description:
					'This source is being removed. Import the referenced workflow into this n8n instance and use the "Database" source, or paste its JSON into the "Parameter" source.',
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
