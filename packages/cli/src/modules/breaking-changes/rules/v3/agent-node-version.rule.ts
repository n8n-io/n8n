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

const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';
const FIRST_SUPPORTED_VERSION = 2;

/** Agent modes that only versions below 2 offered. */
const REMOVED_AGENT_MODES: Record<string, string> = {
	conversationalAgent: 'Conversational Agent',
	openAiFunctionsAgent: 'OpenAI Functions Agent',
	planAndExecuteAgent: 'Plan and Execute Agent',
	reActAgent: 'ReAct Agent',
	sqlAgent: 'SQL Agent',
};

/**
 * Up to version 1.5 the `agent` parameter defaulted to the Conversational Agent, so an unset
 * parameter means Tools Agent only from 1.6 onwards.
 */
function resolveAgentMode(node: INode) {
	if (typeof node.parameters?.agent === 'string') return node.parameters.agent;

	return node.typeVersion <= 1.5 ? 'conversationalAgent' : 'toolsAgent';
}

@BreakingChangeRule({ version: 'v3' })
export class AgentNodeVersionRule implements IBreakingChangeWorkflowRule {
	id = 'agent-node-version-v3';

	getMetadata(): BreakingChangeRuleMetadata {
		return {
			version: 'v3',
			title: 'AI Agent versions below 2 run with version 2 behavior',
			description:
				'AI Agent versions below 2 are removed and every AI Agent node runs with version 2 behavior, which only supports the Tools Agent. Nodes set to the Conversational, OpenAI Functions, Plan and Execute, ReAct or SQL Agent mode stop working and fail with an error when executed.',
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
				action: 'Move AI Agent nodes on versions below 2 to the latest version',
				description:
					'Replace each affected AI Agent node with an AI Agent on the latest version and reconnect its model, memory and tools. Nodes set to the Conversational, OpenAI Functions, Plan and Execute or ReAct Agent mode need to be rebuilt as a Tools Agent. Nodes set to the SQL Agent mode need to be rebuilt as a Tools Agent with a database tool.',
			},
		];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async detectWorkflow(
		_workflow: WorkflowEntity,
		nodesGroupedByType: Map<string, INode[]>,
	): Promise<WorkflowDetectionReport> {
		const affectedNodes = (nodesGroupedByType.get(AGENT_NODE_TYPE) ?? []).filter(
			(node) => node.typeVersion < FIRST_SUPPORTED_VERSION,
		);

		if (affectedNodes.length === 0) return { isAffected: false, issues: [] };

		return {
			isAffected: true,
			issues: affectedNodes.map((node) => {
				const removedMode = REMOVED_AGENT_MODES[resolveAgentMode(node)];

				return {
					title: `Node '${node.name}' uses AI Agent version ${node.typeVersion}`,
					description: removedMode
						? `This node uses the "${removedMode}" mode, which is no longer available. It will fail when executed until it is rebuilt as a Tools Agent on the latest version.`
						: 'This node will run with version 2 behavior of the Tools Agent.',
					level: removedMode ? 'error' : 'warning',
					nodeId: node.id,
					nodeName: node.name,
				};
			}),
		};
	}
}
