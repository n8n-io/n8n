import type { AgentIntegrationConfig } from '@n8n/api-types';

/** Identifies a persisted integration. An empty credential ID identifies a draft. */
export interface IntegrationRef {
	type: string;
	credentialId: string;
}

export interface RequestedAgentIntegration {
	integration: AgentIntegrationConfig;
	setupId?: string;
	replaces?: IntegrationRef;
}

/** Retain the authored set while configured destination channels keep running. */
export interface PendingChannelSetup {
	requested: RequestedAgentIntegration[];
}

export function matchesIntegrationRef(integration: IntegrationRef, ref: IntegrationRef): boolean {
	return integration.type === ref.type && integration.credentialId === ref.credentialId;
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
