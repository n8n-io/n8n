import type { AgentJsonNodeToolConfig, AgentJsonWorkflowToolConfig } from '@n8n/api-types';

import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';

export interface PreparedAgentExport {
	projectId: string;
	content: SerializedAgent;
	metadata: SerializedAgentMetadata;
}

export interface AgentCredentialRequirement {
	credentialId: string;
	credentialName?: string;
	credentialType?: string;
}

export interface AgentExportRequirements {
	agentId: string;
	projectId: string;
	credentials: AgentCredentialRequirement[];
	workflowTools: AgentJsonWorkflowToolConfig[];
	agentIds: string[];
	nodeTools: AgentJsonNodeToolConfig[];
}
