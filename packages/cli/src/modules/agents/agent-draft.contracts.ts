import type { AgentActor, AgentDto, AgentJsonConfig, AgentSkill } from '@n8n/api-types';

export interface CreateAgentDraftOptions {
	id?: string;
	adoptOnCollision?: boolean;
	schema?: AgentJsonConfig;
	skills?: Record<string, AgentSkill>;
	/** Custom tool bodies keyed by tool id, in the shape of the agent row's `tools` column. */
	tools?: Record<string, unknown>;
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

export interface AgentDraftState extends AgentDto {
	adopted: boolean;
}
