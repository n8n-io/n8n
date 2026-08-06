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

const HELPER_NAME = '$getPairedItem';

@BreakingChangeRule({ version: 'v3' })
export class GetPairedItemRule implements IBreakingChangeWorkflowRule {
	id: string = 'get-paired-item-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: '$getPairedItem expression helper is removed',
			description:
				'The $getPairedItem expression helper is removed. Expressions using it will fail to evaluate.',
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
				action: 'Replace $getPairedItem usages',
				description:
					'Rewrite the affected expressions using $input.all() or $("Node").all(), $("Node").item, or $("Node").itemMatching() instead of $getPairedItem.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		workflow: WorkflowEntity,
		_nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = workflow.nodes.filter((node) =>
			JSON.stringify(node.parameters).includes(HELPER_NAME),
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses the removed ${HELPER_NAME} helper`,
				description: `Expressions in this node call ${HELPER_NAME}, which is removed. They will fail to evaluate after the update.`,
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
