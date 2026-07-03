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

// Nodes that can have more than one main output. "Always Output Data" only back-fills the
// first output, injecting an empty item into output 0 even when another output has data,
// which misroutes items. A few configs are single-output (splitInBatches v1, guardrails
// "sanitize"); the advice still applies harmlessly there.
const MULTI_OUTPUT_NODE_TYPES = [
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.compareDatasets',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.dynamicCredentialCheck',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
	'@n8n/n8n-nodes-langchain.guardrails',
];

@BreakingChangeRule({ version: 'v3' })
export class AlwaysOutputDataMultiOutputRule implements IBreakingChangeWorkflowRule {
	id = 'always-output-data-multi-output-v3';

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
		const affectedNodes = MULTI_OUTPUT_NODE_TYPES.flatMap(
			(type) => nodesGroupedByType.get(type) ?? [],
		).filter((node) => node.alwaysOutputData === true);

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
}
