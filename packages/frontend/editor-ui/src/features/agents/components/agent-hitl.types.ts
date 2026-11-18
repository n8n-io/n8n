import type { AgentHitlConfiguration, AgentJsonConfig } from '@n8n/api-types';

export interface AgentHitlContext {
	agentId?: string;
	isPublished?: boolean;
	ensureAgentPersisted?: () => Promise<void>;
	onChannelsChanged?: () => void | Promise<void>;
	getConfig: () => AgentJsonConfig | null;
	getCustomToolName?: (id: string) => string | undefined;
	saveConfiguration: (configuration: AgentHitlConfiguration, toolKeys?: string[]) => void;
}
