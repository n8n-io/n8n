/** Identifies a persisted integration. An empty credential ID identifies a draft. */
export interface IntegrationRef {
	type: string;
	credentialId: string;
}

/** Identifies one channel of one agent across all processes. */
export interface AgentChannelRef {
	agentId: string;
	integrationType: string;
	credentialId: string;
}

export function agentChannelRef(agentId: string, integration: IntegrationRef): AgentChannelRef {
	return { agentId, integrationType: integration.type, credentialId: integration.credentialId };
}

export function agentChannelKey(ref: AgentChannelRef): string {
	return `${ref.agentId}:${ref.integrationType}:${ref.credentialId}`;
}
