import { findMissingAgentDefinitionBodies } from '@/modules/agents/utils/agent-definition';

import type { AgentImportIssue, PreparedAgent } from './agent-import.types';

export function agentBodyIssues(
	agent: Pick<PreparedAgent, 'sourceAgentId' | 'config' | 'skills' | 'tools' | 'tasks'>,
): Array<Extract<AgentImportIssue, { type: 'agent-invalid' }>> {
	return findMissingAgentDefinitionBodies({
		...agent,
		tasks: new Map(Object.entries(agent.tasks)),
	}).map(({ kind, id }) => ({
		type: 'agent-invalid',
		sourceAgentId: agent.sourceAgentId,
		path: `${kind}.${id}`,
		message: `Package Agent references ${kind} asset "${id}" without a body.`,
	}));
}
