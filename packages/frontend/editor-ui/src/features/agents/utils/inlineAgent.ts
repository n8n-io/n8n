import type { AgentCapabilitySummary, InlineAgentConfig } from '@n8n/api-types';

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
 * Shape an inline config like a saved agent's capability summary so surfaces
 * (canvas card chips, model row) can reuse the saved-agent rendering.
 */
export function inlineAgentToCapabilitySummary(
	nodeId: string,
	inlineAgent: InlineAgentConfig,
): AgentCapabilitySummary {
	const { config } = inlineAgent;
	const parsedModel = config.model ? parseModelString(config.model) : null;

	return {
		id: `inline:${nodeId}`,
		name: config.name,
		model: parsedModel ? { provider: parsedModel.provider, model: parsedModel.name } : null,
		channels: [],
		tools: toCapabilitySummaryTools(config.tools),
		mcpServers: (config.mcpServers ?? []).map((server) => ({ name: server.name })),
		skills: [],
		tasks: [],
	};
}
