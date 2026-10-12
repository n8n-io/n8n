import type { AgentImportIssue, PreparedAgent } from './agent-import.types';

export function agentBodyIssues(
	agent: Pick<PreparedAgent, 'sourceAgentId' | 'config' | 'skills' | 'tools' | 'tasks'>,
): Array<Extract<AgentImportIssue, { type: 'agent-invalid' }>> {
	const references = {
		skills: agent.config?.skills ?? [],
		tools: agent.config?.tools?.filter((tool) => tool.type === 'custom') ?? [],
		tasks: agent.config?.tasks ?? [],
	};
	const issues: Array<Extract<AgentImportIssue, { type: 'agent-invalid' }>> = [];
	for (const collection of ['skills', 'tools', 'tasks'] as const) {
		for (const { id } of references[collection]) {
			if (Object.hasOwn(agent[collection], id)) continue;
			issues.push({
				type: 'agent-invalid',
				sourceAgentId: agent.sourceAgentId,
				path: `${collection}.${id}`,
				message: `Package Agent references ${collection} asset "${id}" without a body.`,
			});
		}
	}
	return issues;
}
