import type { ToolDescriptor } from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';

import type { SerializedAgentTask } from '../../spec/serialized/agent.schema';

export interface PreparedAgentFile {
	fileName: string;
	mimeType: string;
	fileSizeBytes: number;
	content: Buffer;
}

/** One package agent, parsed and ready to plan: config, bodies, and file bytes. */
export interface PreparedAgent {
	sourceAgentId: string;
	name: string;
	config: AgentJsonConfig | null;
	tools: Record<string, { code: string; descriptor: ToolDescriptor }>;
	skills: Record<string, AgentSkill>;
	tasks: SerializedAgentTask[];
	availableInMCP: boolean;
	files: PreparedAgentFile[];
}

export interface AgentImportRequest {
	agents: PreparedAgent[];
}

export interface AgentResolutionFailure {
	kind: 'id-exists' | 'module-disabled';
	sourceId?: string;
	name?: string;
}

export interface AgentImportPlan {
	creations: PreparedAgent[];
	failures: AgentResolutionFailure[];
}
