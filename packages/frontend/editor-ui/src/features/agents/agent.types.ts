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

import type { AgentVersionDto, AgentSkill } from '@n8n/api-types';

export type AgentVersion = AgentVersionDto;

export type Agent = {
	id: string;
	name: string;
	description: string | null;
	projectId: string;
	isCompiled: boolean;
	isRunnable?: boolean;
	createdAt: string;
	updatedAt: string;
	versionId: string | null;
	activeVersionId: string | null;
	tools: Record<string, CustomToolEntry>;
	skills: Record<string, AgentSkill>;
	activeVersion: AgentVersion | null;
};
