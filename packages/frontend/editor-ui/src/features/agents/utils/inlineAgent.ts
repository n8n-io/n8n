import type { AgentCapabilitySummary, InlineAgentConfig } from '@n8n/api-types';
import { generateNanoId } from '@n8n/utils/generate-nano-id';

import type { INodeUi } from '@/Interface';

import { toCapabilitySummaryTools } from './capabilitySummaryTools';
import { parseModelString } from './model-string';

export type AgentSourceMode = 'referenced' | 'inline';

/** Parameter names on the MessageAnAgent v2 node. */
export const AGENT_SOURCE_PARAMETER_NAME = 'agentSource';
export const INLINE_AGENT_PARAMETER_NAME = 'inlineAgent';

/** Missing/unknown values resolve to 'referenced' — pre-switch nodes have no stored agentSource. */
export function readAgentSource(node: INodeUi | null): AgentSourceMode {
	return node?.parameters?.[AGENT_SOURCE_PARAMETER_NAME] === 'inline' ? 'inline' : 'referenced';
}

export function readInlineAgentParameter(node: INodeUi | null): InlineAgentConfig | null {
	const raw = node?.parameters?.[INLINE_AGENT_PARAMETER_NAME];
	if (
		raw &&
		typeof raw === 'object' &&
		typeof (raw as Partial<InlineAgentConfig>).config === 'object'
	) {
		return raw as InlineAgentConfig;
	}
	return null;
}

export const DEFAULT_INLINE_AGENT_NAME = 'AI Agent';
export const DEFAULT_INLINE_AGENT_INSTRUCTIONS = 'You are a helpful agent';

/** Seed for a node that switches to inline mode before any agent is defined. */
export function createDefaultInlineAgent(): InlineAgentConfig {
	return {
		config: {
			name: DEFAULT_INLINE_AGENT_NAME,
			model: '',
			instructions: DEFAULT_INLINE_AGENT_INSTRUCTIONS,
		},
	};
}

/**
 * Mirror of the backend's `generateAgentResourceId('skill', …)` for inline
 * agents, whose skill ids are minted client-side (there is no entity to POST
 * to). Same `skill_<nanoid>` format, same collision retry.
 */
export function generateInlineSkillId(existingIds: Iterable<string> = []): string {
	const existing = new Set(existingIds);

	for (let attempt = 0; attempt < 10; attempt++) {
		const id = `skill_${generateNanoId()}`;
		if (!existing.has(id)) return id;
	}

	throw new Error('Could not generate unique skill id');
}

/**
 * Shape an inline config like a saved agent's capability summary so surfaces
 * (canvas card chips, model row) can reuse the saved-agent rendering.
 */
export function inlineAgentToCapabilitySummary(
	nodeId: string,
	inlineAgent: InlineAgentConfig,
): AgentCapabilitySummary {
	const { config } = inlineAgent;
	const parsedModel = config.model ? parseModelString(config.model) : null;
	// The parameter JSON is unvalidated until execution: tolerate a non-array
	// `skills` and skip malformed refs instead of crashing the canvas render
	// (same contract as `toCapabilitySummaryTools`). Bodies are resolved by own
	// key only, so ids like "constructor" can't surface prototype members; the
	// id fallback also covers a body an external edit removed — the editor
	// prunes the reverse case (orphan bodies) on write.
	const skillBodies = inlineAgent.skills ?? {};
	const skillRefs = (Array.isArray(config.skills) ? config.skills : []).filter(
		(ref) => typeof ref?.id === 'string' && ref.id !== '',
	);

	return {
		id: `inline:${nodeId}`,
		name: config.name,
		model: parsedModel ? { provider: parsedModel.provider, model: parsedModel.name } : null,
		channels: [],
		tools: toCapabilitySummaryTools(config.tools),
		mcpServers: (config.mcpServers ?? []).map((server) => ({ name: server.name })),
		skills: skillRefs.map((ref) => ({
			id: ref.id,
			name: (Object.hasOwn(skillBodies, ref.id) ? skillBodies[ref.id]?.name : undefined) ?? ref.id,
		})),
		tasks: [],
	};
}
