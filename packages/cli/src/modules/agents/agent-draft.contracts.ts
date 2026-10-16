import type { ToolDescriptor } from '@n8n/agents';
import type { AgentIntegrationConfig, AgentSkill, StoredAgentConfig } from '@n8n/api-types';

export interface AgentDraftState {
	id: string;
	name: string;
	projectId: string;
	schema: StoredAgentConfig | null;
	integrations: AgentIntegrationConfig[];
	tools: Record<string, { code: string; descriptor: ToolDescriptor }>;
	skills: Record<string, AgentSkill>;
	availableInMCP: boolean;
	setupCompletedAt: Date | null;
	versionId: string | null;
	activeVersionId: string | null;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
	isRunnable: boolean;
	hasPublishHistory: boolean;
	configHash: string | null;
	skillHashes: Record<string, string>;
	outdatedSkillIds: string[];
}
