import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';

import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type { InstanceAiTraceRun, ModelConfig } from '../types';

export interface SubAgentOptions {
	/** Unique ID for this sub-agent instance (e.g., "agent-V1StGX") */
	agentId: string;
	/** Free-form role description */
	role: string;
	/** Task-specific system prompt written by the orchestrator */
	instructions: string;
	/** Validated subset of domain tools */
	tools: ToolsInput;
	/** Model config (same as orchestrator) */
	modelId: ModelConfig;
	/** Optional trace run to annotate with the sub-agent's static config */
	traceRun?: InstanceAiTraceRun;
}

/** Hard protocol injected into every sub-agent — cannot be overridden by orchestrator instructions. */
const SUB_AGENT_PROTOCOL = `## Output Protocol (MANDATORY)
You are reporting to a parent agent, NOT a human user. Your output is machine-consumed.
- Return ONLY structured data: IDs, statuses, errors, counts.
- NO prose, NO narration, NO emojis, NO markdown headers (## or **bold**), NO filler phrases.
- Do NOT describe what you are about to do or what you did. Just return the facts.
- One tool call at a time unless truly independent. Minimum tool calls needed.
- You cannot delegate to other agents or create plans.
- If you are stuck or need information only a human can provide, use the ask-user tool.
- Do NOT retry the same failing approach more than twice — ask the user instead.`;

export { SUB_AGENT_PROTOCOL };

function buildSubAgentPrompt(role: string, instructions: string): string {
	return `${SUB_AGENT_PROTOCOL}

You are a sub-agent with the role: ${role}.

## Task
${instructions}`;
}

export function createSubAgent(options: SubAgentOptions): Agent {
	const { agentId, role, instructions, tools, modelId, traceRun } = options;

	const systemPrompt = buildSubAgentPrompt(role, instructions);

	const agent = new Agent({
		id: agentId,
		name: `Sub-Agent: ${role}`,
		instructions: {
			role: 'system' as const,
			content: systemPrompt,
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		},
		model: modelId,
		tools,
	});

	mergeTraceRunInputs(
		traceRun,
		buildAgentTraceInputs({
			systemPrompt,
			tools,
			modelId,
		}),
	);

	return agent;
}
