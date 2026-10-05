export type AgentRequirementSource = { agentId: string; projectId: string };

export type RequirementSource = { workflowId: string } | AgentRequirementSource;

export interface RequirementUsage {
	usedByWorkflows: string[];
	usedByAgents?: string[];
}

/** Keep agent IDs out of the workflow usage list, including when IDs coincide. */
export function addRequirementUsage(usage: RequirementUsage, source: RequirementSource): void {
	if ('workflowId' in source) {
		if (!usage.usedByWorkflows.includes(source.workflowId)) {
			usage.usedByWorkflows.push(source.workflowId);
		}
		return;
	}
	const agents = (usage.usedByAgents ??= []);
	if (!agents.includes(source.agentId)) agents.push(source.agentId);
}
