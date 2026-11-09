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
				'The AI Transform node is deprecated, and workflows that use it fail after the update. Replace each AI Transform node with a Code node that runs the same generated code.',
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Replace AI Transform with a Code node',
				description:
					'Add a Code node with Language set to JavaScript and Mode set to Run Once for All Items. Copy the generated code of the AI Transform node into it, then delete the AI Transform node. Both nodes run the code in the same sandbox, so the output does not change. If the AI Transform node has no generated code yet, generate it first.',
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
				'The AI Transform node is deprecated. Migrate it to a Code node to keep it working.',
			level: 'warning',
		}));
	}
}
