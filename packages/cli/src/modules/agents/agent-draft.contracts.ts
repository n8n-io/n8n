import type { ToolDescriptor } from '@n8n/agents';
import type {
	AgentActor,
	AgentCreationState,
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
	/** Internal seeds omit this field to keep creation telemetry silent. */
	createdBy?: AgentActor;
}

export interface AgentDraftReference {
	agentId: string;
	projectId: string;
	name: string;
	adopted: boolean;
}

export interface PersistAgentDraftOptions {
	id: string;
	name: string;
	adoptOnCollision: boolean;
	config?: Record<string, unknown>;
	pushRef?: string;
}

export interface PersistedAgentDraft {
	id: string;
	name: string;
	getState(): Promise<AgentDraftState>;
}

export interface AgentDraftState extends AgentCreationState {
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
	skillHashes: Record<string, string>;
	outdatedSkillIds: string[];
}
