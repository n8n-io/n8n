import type { AgentDto, AgentListItemDto } from '@n8n/api-types';

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

/** Single-agent response. `config` is the document a PUT writes back. */
export type Agent = AgentDto;

/** Project and overview list row. It has no `config`, so it is not a PUT body. */
export type AgentListItem = AgentListItemDto;

/**
 * List rows omit `config`. A full agent response is projected so the list
 * cache can store either shape.
 */
export function toAgentListItem(agent: Agent | AgentListItem): AgentListItem {
	if (!('config' in agent)) return agent;
	return {
		id: agent.id,
		name: agent.name,
		projectId: agent.projectId,
		project: agent.project,
		availableInMCP: agent.availableInMCP,
		versionId: agent.versionId,
		activeVersionId: agent.activeVersionId,
		createdAt: agent.createdAt,
		updatedAt: agent.updatedAt,
		personalisation: agent.config?.personalisation ?? null,
		hasConfig: agent.config !== null,
	};
}
