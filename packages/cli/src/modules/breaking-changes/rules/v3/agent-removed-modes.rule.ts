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
 * Covers the nodes that stop working after the update. Nodes below version 2 that keep working
 * are reported by the AgentNodeVersionRule instead.
 */
@BreakingChangeRule({ version: 'v3' })
export class AgentRemovedModesRule implements IBreakingChangeWorkflowRule {
	id = 'agent-removed-modes-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'Deprecated AI Agent modes removed',
			description:
				'AI Agent versions below 2 are removed, and with them the Conversational, OpenAI Functions, Plan and Execute, ReAct and SQL Agent modes, which version 2 does not offer. After the update, nodes set to one of these modes will fail when executed.',
			category: BreakingChangeCategory.workflow,
			severity: 'critical',
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async getRecommendations(
		_workflowResults: BreakingChangeAffectedWorkflow[],
	): Promise<BreakingChangeRecommendation[]> {
		return [
			{
				action: 'Rebuild AI Agent nodes that use a removed mode',
				description:
					'Replace each affected AI Agent node with an AI Agent on the latest version and reconnect its model, memory and tools. Nodes that used the SQL Agent mode also need a database tool connected to keep querying their database.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = getAgentNodesBelowFirstSupportedVersion(nodesGroupedByType).flatMap(
			(node) => {
				const removedMode = getRemovedAgentMode(node);

				return removedMode ? [{ node, removedMode }] : [];
			},
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map(({ node, removedMode }) => ({
				title: `Node '${node.name}' uses the "${removedMode}" mode of AI Agent version ${node.typeVersion}`,
				description: `The "${removedMode}" mode is no longer available. After the update, this node will fail when executed until it is replaced with an AI Agent on the latest version.`,
				level: 'error',
				nodeId: node.id,
				nodeName: node.name,
			})),
		};
	}
}
