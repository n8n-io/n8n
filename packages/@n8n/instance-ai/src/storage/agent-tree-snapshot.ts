import type { InstanceAiAgentNode } from '@n8n/api-types';

export interface AgentTreeSnapshot {
	tree: InstanceAiAgentNode;
	runId: string;
	messageGroupId?: string;
	runIds?: string[];
	langsmithRunId?: string;
	langsmithTraceId?: string;
}
