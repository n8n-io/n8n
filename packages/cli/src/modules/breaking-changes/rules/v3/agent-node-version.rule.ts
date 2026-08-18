import type { BreakingChangeAffectedWorkflow, BreakingChangeRecommendation } from '@n8n/api-types';
import type { WorkflowEntity } from '@n8n/db';
import { BreakingChangeRule } from '@n8n/decorators';
import type { INode } from 'n8n-workflow';

import { getAgentNodesBelowFirstSupportedVersion, getRemovedAgentMode } from './agent-node-mode';
import type {
	BreakingChangeRuleMetadata,
	IBreakingChangeWorkflowRule,
	WorkflowDetectionReport,
} from '../../types';
import { BreakingChangeCategory } from '../../types';

/**
 * Covers the nodes that keep working after the update. Nodes on a mode that version 2 never
 * offered are reported by the AgentRemovedModesRule instead, which is critical rather than medium.
 */
@BreakingChangeRule({ version: 'v3' })
export class AgentNodeVersionRule implements IBreakingChangeWorkflowRule {
	id = 'agent-node-version-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'AI Agent versions below 2 are removed',
			description:
				'AI Agent versions below 2 are removed. After the update, AI Agent nodes that are currently on a version below 2 will run with version 2 behavior, which only supports the Tools Agent.',
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
				action: 'Move AI Agent nodes on versions below 2 to the latest version',
				description:
					'Replace each affected AI Agent node with an AI Agent on the latest version and reconnect its model, memory and tools, then run the workflow to confirm it still behaves as expected.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = getAgentNodesBelowFirstSupportedVersion(nodesGroupedByType).filter(
			(node) => !getRemovedAgentMode(node),
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => ({
				title: `Node '${node.name}' uses AI Agent version ${node.typeVersion}`,
				description: 'After the update, this node will run with version 2 behavior.',
				level: 'warning',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
