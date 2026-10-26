import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';

export interface AgentHitlContext {
	agentId?: string;
	getConfig: () => AgentJsonConfig | null;
	saveConfiguration: (configuration: AgentHitlConfiguration) => void;
}
