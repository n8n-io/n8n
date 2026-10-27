import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import { reportAffectedNodes } from '../../detection-report';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

export const AI_TRANSFORM_NODE_TYPE = 'n8n-nodes-base.aiTransform';

@BreakingChangeRule({ version: 'v3' })
export class AiTransformDeprecatedRule implements IBreakingChangeWorkflowRule {
	id: string = 'ai-transform-deprecated';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'AI Transform node is deprecated',
			description:
				'The AI Transform node is deprecated and v3 removes it. After the upgrade, a published workflow that still contains it does not activate. Run the automatic migration from the Migration Report to replace it with a Code node that runs the same generated code.',
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
			documentationUrl: 'https://docs.n8n.io/changelog/v30-breaking-changes',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Run the automatic migration to a Code node',
				description:
					'Run the automatic migration from the Migration Report before you upgrade. It replaces each AI Transform node with a Code node that runs the same generated JavaScript. If a node never generated code, the migration cannot convert it: replace that node with a Code node by hand.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = nodesGroupedByType.get(AI_TRANSFORM_NODE_TYPE) ?? [];

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' uses the deprecated AI Transform node`,
			description:
				'Run the automatic migration from the Migration Report to replace this node with a Code node. If this workflow is published, it does not activate after the upgrade until you migrate this node.',
			level: 'warning',
		}));
	}
}
