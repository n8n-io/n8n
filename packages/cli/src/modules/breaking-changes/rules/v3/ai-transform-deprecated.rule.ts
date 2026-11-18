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
			title: 'AI Transform node removed',
			description:
<<<<<<< HEAD
				'The AI Transform node is no longer supported. Migrate it to a Code node, which runs its generated code unchanged.',
=======
				'The AI Transform node is deprecated, and workflows that use it fail after the update.',
>>>>>>> 24f9f2d0cbca37bbde0d85d4cb576701e84a15f1
			category: BreakingChangeCategory.workflow,
			impact: 'executionsFail',
			assistant: 'fix',
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
<<<<<<< HEAD
					'The AI Transform node ran its generated JavaScript in the same sandbox as the Code node. Migrate it to a Code node to keep that code running.',
=======
					'Give the Code node the same name and connections as the AI Transform node. Set Language to JavaScript and Mode to Run Once for All Items, then copy in the generated code and node settings such as Always Output Data. If the AI Transform node has no generated code, generate it first.',
>>>>>>> 24f9f2d0cbca37bbde0d85d4cb576701e84a15f1
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
			title: `AI Transform node '${node.name}' is no longer supported`,
			description:
				'The AI Transform node is no longer supported. Migrate it to a Code node to keep its generated code running.',
			level: 'error',
		}));
	}
}
