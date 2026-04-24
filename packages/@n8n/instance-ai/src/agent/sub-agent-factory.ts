import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';

import { SECRET_ASK_GUARDRAIL } from './credential-guardrails.prompt';
import { ASK_USER_FALLBACK, SUBAGENT_OUTPUT_CONTRACT } from './shared-prompts';
import { getDateTimeSection } from './system-prompt';
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
	/** IANA time zone for the current user — used to render the datetime section so
	 *  the sub-agent resolves "now" consistently with the orchestrator. */
	timeZone?: string;
}

/** Hard protocol injected into every sub-agent — cannot be overridden by orchestrator instructions. */
const SUB_AGENT_PROTOCOL = `${SUBAGENT_OUTPUT_CONTRACT}

### Structured Result
Return a concise result summary: IDs created, statuses, counts, errors encountered.

### Diagnostic Context (when relevant)
If you encountered errors, retried operations, or made non-obvious decisions, add a brief
diagnostic section at the end explaining:
- What approaches you tried and why they failed
- What blockers remain (missing credentials, permissions, API errors)
- What assumptions you made

Keep diagnostics to 2-3 sentences maximum. Omit entirely when the task succeeded cleanly.

### Delegate Rules
- One tool call at a time unless truly independent. Minimum tool calls needed.
- You cannot delegate to other agents or create plans.
- ${ASK_USER_FALLBACK}
- ${SECRET_ASK_GUARDRAIL}`;

export { SUB_AGENT_PROTOCOL };

function buildSubAgentPrompt(role: string, instructions: string, timeZone?: string): string {
	return `${SUB_AGENT_PROTOCOL}
${getDateTimeSection(timeZone)}

You are a sub-agent with the role: ${role}.

## Task
${instructions}`;
}

export function createSubAgent(options: SubAgentOptions): Agent {
	const { agentId, role, instructions, tools, modelId, traceRun, timeZone } = options;

	const systemPrompt = buildSubAgentPrompt(role, instructions, timeZone);

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
