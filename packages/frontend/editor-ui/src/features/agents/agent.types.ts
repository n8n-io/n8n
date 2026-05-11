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

import type { AgentPublishedVersionDto, AgentSkill } from '@n8n/api-types';

export type AgentPublishedVersion = AgentPublishedVersionDto;

export type Agent = {
	id: string;
	name: string;
	description: string | null;
	projectId: string;
	credentialId: string | null;
	provider: string | null;
	model: string | null;
	isCompiled: boolean;
	createdAt: string;
	updatedAt: string;
	versionId: string | null;
	tools: Record<string, CustomToolEntry>;
	skills: Record<string, AgentSkill>;
	publishedVersion: AgentPublishedVersion | null;
};
