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

/**
 * `AgentDto` and `AgentListItemDto` are classes, and class types get no
 * implicit index signatures. These structural copies keep agent rows
 * assignable to generic list components that type their rows against
 * index-signature shapes.
 *
 * `tools` is re-typed with the frontend's `CustomToolEntry`: the wire carries
 * the full tool descriptor per entry, while the response schema only asserts
 * the field the API contract needs.
 */
/** Single-agent response. `config` is the document a PUT writes back. */
export type Agent = Omit<{ [K in keyof AgentDto]: AgentDto[K] }, 'tools'> & {
	tools: Record<string, CustomToolEntry>;
};

/** Project and overview list row. It has no `config`, so it is not a PUT body. */
export type AgentListItem = { [K in keyof AgentListItemDto]: AgentListItemDto[K] };

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
		isArchived: agent.isArchived,
		versionId: agent.versionId,
		activeVersionId: agent.activeVersionId,
		createdAt: agent.createdAt,
		updatedAt: agent.updatedAt,
		personalisation: agent.config?.personalisation ?? null,
		hasConfig: agent.config !== null,
		skillVersions: agent.skillVersions,
	};
}
