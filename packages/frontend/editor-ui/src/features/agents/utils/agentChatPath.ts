/**
 * Code-defined system agents (the n8n Assistant). Their chat routes are not
 * project routes: each thread carries its own working project.
 */
const SYSTEM_AGENT_IDS = new Set(['n8n-assistant']);

export function isSystemAgentId(agentId: string): boolean {
	return SYSTEM_AGENT_IDS.has(agentId);
}

/** REST path of an agent's chat routes, without the `/chat` suffix. */
export function agentChatBasePath(projectId: string, agentId: string): string {
	return isSystemAgentId(agentId)
		? `/agents/system/${encodeURIComponent(agentId)}`
		: `/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}`;
}

/**
 * REST path to send a chat message. A system agent's new session takes its
 * working project from the query.
 */
export function agentChatSendPath(projectId: string, agentId: string): string {
	const base = `${agentChatBasePath(projectId, agentId)}/chat`;
	return isSystemAgentId(agentId) ? `${base}?projectId=${encodeURIComponent(projectId)}` : base;
}
