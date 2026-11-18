import type { AgentProposalEdit, AgentProposalEditInput } from '@n8n/api-types';

export type AgentProposalBaseTool = {
	type: 'node' | 'workflow' | 'mcp' | 'custom';
	/** The name the model sees (sanitized). For mcp, the server name. */
	name: string;
	description: string | null;
	/** False for custom tools and MCP servers. */
	editable: boolean;
};

export type AgentProposalBaseSkill = {
	id: string;
	name: string;
	description: string;
	instructions: string;
	editable: boolean;
	/** Why the skill text cannot be edited. Only when `editable` is false. */
	notEditableReason?: string;
};

/** The published content of an agent that a proposal can edit. */
export type AgentProposalBase = {
	agentId: string;
	agentName: string;
	/** `agents.activeVersionId`. */
	versionId: string;
	/** When this version became the published version. */
	publishedAt: Date;
	model: string | null;
	instructions: string;
	/** Enabled tools only. A disabled tool does not reach the model. */
	tools: AgentProposalBaseTool[];
	skills: AgentProposalBaseSkill[];
	/** Names of configured sub-agents, for context only. */
	subAgents: string[];
};

export type AgentProposalUnavailableReason =
	| 'not_found'
	| 'not_published'
	| 'archived'
	| 'unpublished_changes';

export type AgentProposalBaseResult =
	| { base: AgentProposalBase }
	| { unavailable: AgentProposalUnavailableReason };

export type AgentProposalNormalizeResult = { edits: AgentProposalEdit[] } | { errors: string[] };

export type AgentProposalApplyProgress = {
	/** IDs of the skills that the apply saved. */
	savedSkillIds: string[];
	/** The agent version that holds all edits and that the apply must publish. */
	savedVersionId: string | null;
};

export type AgentProposalApplyResult =
	| { status: 'published'; publishedVersionId: string; progress: AgentProposalApplyProgress }
	| { status: 'outdated' }
	| { status: 'failed'; retryable: boolean; error: string; progress: AgentProposalApplyProgress };

export type { AgentProposalEdit, AgentProposalEditInput };
