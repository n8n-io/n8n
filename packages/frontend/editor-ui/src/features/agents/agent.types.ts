export interface ToolDescriptor {
	name: string;
	description: string;
	systemInstruction: string | null;
	inputSchema: Record<string, unknown> | null;
	outputSchema: Record<string, unknown> | null;
	hasSuspend: boolean;
	hasResume: boolean;
	hasToMessage: boolean;
	requireApproval: boolean;
	providerOptions: Record<string, unknown> | null;
}

export interface CustomToolEntry {
	code: string;
	descriptor: ToolDescriptor;
}

import type { AgentVersionDto, AgentSkill, AgentJsonConfig } from '@n8n/api-types';

export type AgentVersion = AgentVersionDto;

export type Agent = {
	id: string;
	name: string;
	projectId: string;
	isCompiled: boolean;
	isRunnable?: boolean;
	hasPublishHistory?: boolean;
	createdAt: string;
	updatedAt: string;
	versionId: string | null;
	activeVersionId: string | null;
	// Narrow declaration of the agent's draft config, which the REST payloads
	// already carry in full — only the fields the frontend reads off list
	// responses are typed here.
	schema?: Pick<AgentJsonConfig, 'personalisation'> | null;
	tools: Record<string, CustomToolEntry>;
	skills: Record<string, AgentSkill>;
	activeVersion: AgentVersion | null;
};
