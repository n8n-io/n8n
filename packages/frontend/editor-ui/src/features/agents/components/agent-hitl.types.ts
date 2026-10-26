import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';

export interface AgentHitlContext {
	getConfig: () => AgentJsonConfig | null;
	saveConfiguration: (configuration: AgentHitlConfiguration) => void;
}
