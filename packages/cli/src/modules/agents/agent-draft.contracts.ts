import type { ToolDescriptor } from '@n8n/agents';
import type {
	AgentIntegrationConfig,
	AgentJsonConfig,
	AgentSkill,
	StoredAgentConfig,
} from '@n8n/api-types';

export interface CreateAgentDraftOptions {
	id?: string;
	adoptOnCollision?: boolean;
	schema?: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
}

export interface AgentDraftReference {
	agentId: string;
	projectId: string;
	name: string;
	adopted: boolean;
}

export interface PersistedAgentDraft {
	id: string;
	name: string;
	getState(): Promise<AgentDraftState>;
}

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
