import type { AgentJsonNodeToolConfig, AgentJsonWorkflowToolConfig } from '@n8n/api-types';

import type { SerializedAgent, SerializedAgentMetadata } from '../../spec/serialized/agent.schema';
import type { AgentCredentialRequirement } from '../credential/credential.types';

export interface PreparedAgentExport {
	projectId: string;
	content: SerializedAgent;
	metadata: SerializedAgentMetadata;
}

export interface AgentExportRequirements {
	agentId: string;
	projectId: string;
	credentials: AgentCredentialRequirement[];
	workflowTools: AgentJsonWorkflowToolConfig[];
	agentIds: string[];
	nodeTools: AgentJsonNodeToolConfig[];
}
