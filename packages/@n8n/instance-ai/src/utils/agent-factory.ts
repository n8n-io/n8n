/**
 * Builds an agent from an explicit model config.
 *
 * The model is supplied by the caller and used verbatim — no environment
 * lookup, no fallback ordering. User-facing features resolve their model from
 * the instance's configuration (licensed proxy, admin credential, user
 * credential) and must run on it; an env var naming a different model is not
 * allowed to win. `createEvalAgent` layers env-based resolution on top of this
 * for the eval harness, which does want to pin a model that way.
 */

import { Agent, type ModelConfig } from '@n8n/agents';

import { applyAgentThinking } from '../agent/apply-agent-thinking';

/** Anthropic `providerOptions` payload marking the preceding block as an ephemeral cache breakpoint. */
export const EPHEMERAL_CACHE = {
	anthropic: { cacheControl: { type: 'ephemeral' as const } },
};

export interface CreateAgentFromModelOptions {
	/** Resolved model. Used as given. */
	modelConfig: ModelConfig;
	instructions: string;
	/** Mark the instructions as a cache breakpoint — worth it for a large, stable system prompt. */
	cache?: boolean;
}

export function createAgentFromModel(name: string, options: CreateAgentFromModelOptions): Agent {
	const agent = new Agent(name).model(options.modelConfig);

	if (options.cache) {
		agent.instructions(options.instructions, { providerOptions: EPHEMERAL_CACHE });
	} else {
		agent.instructions(options.instructions);
	}

	applyAgentThinking(agent, options.modelConfig);

	return agent;
}
