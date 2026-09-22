/** Identifies one channel of one agent across all processes. */
export interface AgentChannelRef {
	agentId: string;
	integrationType: string;
	credentialId: string;
}

export function agentChannelRef(
	agentId: string,
	integration: { type: string; credentialId: string },
): AgentChannelRef {
	return { agentId, integrationType: integration.type, credentialId: integration.credentialId };
}

export function agentChannelKey(ref: AgentChannelRef): string {
	return `${ref.agentId}:${ref.integrationType}:${ref.credentialId}`;
}
