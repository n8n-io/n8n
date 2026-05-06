import type { InstanceAiAgentNode } from '@n8n/api-types';

export interface AgentTreeSnapshot {
	tree: InstanceAiAgentNode;
	runId: string;
	messageGroupId?: string;
	runIds?: string[];
	langsmithRunId?: string;
	langsmithTraceId?: string;
	/** Row creation timestamp. Used by `parseStoredMessages` to position
	 *  orphan snapshots (interrupted runs that never persisted to Mastra
	 *  memory) chronologically alongside Mastra-paired messages. */
	createdAt: Date;
}
