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

const HELPER_NAME = '$evaluateExpression';
const CODE_NODE_TYPE = 'n8n-nodes-base.code';

@BreakingChangeRule({ version: 'v3' })
export class EvaluateExpressionCodeNodeRule implements IBreakingChangeWorkflowRule {
	id: string = 'evaluate-expression-code-node-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: '$evaluateExpression() is removed from the Code node',
			description:
				'The $evaluateExpression() method is removed from the Code node (JavaScript). Task runners in secure mode, the default since n8n 2.0, already fail on this call. Task runners in insecure mode (N8N_RUNNERS_INSECURE_MODE=true) fail after the update. $evaluateExpression() still works in {{ }} expression fields.',
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
				action: 'Evaluate the expression in a node field',
				description:
					'Move the expression into a node field before the Code node, for example an Edit Fields (Set) node. Then read the result from the input item in the Code node.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const codeNodes = nodesGroupedByType.get(CODE_NODE_TYPE) ?? [];
		const affectedNodes = codeNodes.filter((node) => {
			// Same language resolution as the Code node: v1 is always JavaScript
			const language =
				node.typeVersion === 2 ? (node.parameters?.language ?? 'javaScript') : 'javaScript';
			if (language !== 'javaScript') return false;

			const code = node.parameters?.jsCode;
			return typeof code === 'string' && code.includes(HELPER_NAME);
		});

		return reportAffectedNodes(affectedNodes, (node) => ({
			title: `Node '${node.name}' calls ${HELPER_NAME}()`,
			description: `The JavaScript code in this node calls ${HELPER_NAME}(), which is removed from the Code node. The node fails after the update.`,
			level: 'error',
		}));
	}
}
