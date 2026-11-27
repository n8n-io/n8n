// ---------------------------------------------------------------------------
// Simulated user for multi-turn Agent runs (AGENT-1666). The workflow-build
// proxy in this folder answers the builder's cards and plans; this one talks
// to a running Agent, steered only by the session's goal. It never sees the
// scenario's expectations, so it cannot leak them to the Agent.
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { AGENT_USER_SYSTEM_PROMPT, buildAgentUserPrompt } from './agent-user-prompts';
import { createEvalAgent } from '../../../src/utils/eval-agents';
import type { EvalLogger } from '../../harness/logger';

const agentUserDecisionSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('send_message'),
		message: z.string().describe("The user's next chat message, in the user's own words."),
	}),
	z.object({ action: z.literal('declare_done') }),
]);

export type AgentUserDecision = z.infer<typeof agentUserDecisionSchema>;

export interface AgentUserTurn {
	role: 'user' | 'assistant';
	text: string;
}

export interface AgentUserContext {
	/** What the user wants from this session. */
	goal: string;
	/** The scenario's world, so the user's details stay consistent with it. */
	dataSetup: string;
	/** This session's conversation so far. Empty: the user opens the session. */
	transcript: AgentUserTurn[];
	/** Earlier sessions with the same Agent, in order. The user remembers them. */
	earlierSessions: AgentUserTurn[][];
}

export interface AgentUserProxy {
	/** The user's next message, or undefined when the user is done. */
	nextMessage(context: AgentUserContext): Promise<string | undefined>;
}

export interface AgentUserProxyConfig {
	modelId?: string;
	logger?: EvalLogger;
}

export function createAgentUserProxy(config: AgentUserProxyConfig = {}): AgentUserProxy {
	return {
		async nextMessage(context) {
			const decision = await decide(buildAgentUserPrompt(context), config);
			if (decision?.action !== 'send_message') return undefined;
			const message = decision.message.trim();
			return message.length > 0 ? message : undefined;
		},
	};
}

async function decide(
	prompt: string,
	config: AgentUserProxyConfig,
): Promise<AgentUserDecision | undefined> {
	const agent = createEvalAgent('eval-agent-user-proxy', {
		...(config.modelId ? { model: config.modelId } : {}),
		instructions: AGENT_USER_SYSTEM_PROMPT,
		cache: true,
	}).structuredOutput(agentUserDecisionSchema);
	try {
		const result = await agent.generate(prompt);
		const parsed = agentUserDecisionSchema.safeParse(result.structuredOutput);
		if (!parsed.success) config.logger?.warn('[agent-user] no usable decision; ending the session');
		return parsed.success ? parsed.data : undefined;
	} catch (error) {
		config.logger?.warn(
			`[agent-user] decision failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return undefined;
	}
}
