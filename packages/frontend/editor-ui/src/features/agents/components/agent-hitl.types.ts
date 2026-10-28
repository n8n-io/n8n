import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';

export interface AgentHitlContext {
	agentId?: string;
	getConfig: () => AgentJsonConfig | null;
	getCustomToolName?: (id: string) => string | undefined;
	saveConfiguration: (configuration: AgentHitlConfiguration, toolKeys?: string[]) => void;
}
