import { Agent, type CheckpointStore } from '@n8n/agents';

import { SECRET_ASK_GUARDRAIL } from './credential-guardrails.prompt';
import { ASK_USER_FALLBACK, SUBAGENT_OUTPUT_CONTRACT } from './shared-prompts';
import { getDateTimeSection } from './system-prompt';
import { toolRegistryValues } from '../tool-registry';
import { buildAgentTraceInputs, mergeTraceRunInputs } from '../tracing/langsmith-tracing';
import type {
	InstanceAiToolRegistry,
	InstanceAiTraceContext,
	InstanceAiTraceRun,
	ModelConfig,
} from '../types';

export interface SubAgentOptions {
	/** Unique ID for this sub-agent instance (e.g., "agent-V1StGX") */
	agentId: string;
	/** Free-form role description */
	role: string;
	/** Task-specific system prompt written by the orchestrator */
	instructions: string;
	/** Validated subset of domain tools */
	tools: InstanceAiToolRegistry;
	/** Model config (same as orchestrator) */
	modelId: ModelConfig;
	/** Native checkpoint store for HITL/suspend state. */
	checkpointStore?: CheckpointStore;
	/** Optional trace run to annotate with the sub-agent's static config */
	traceRun?: InstanceAiTraceRun;
	/** Optional trace context used to attach native AI SDK telemetry. */
	tracing?: InstanceAiTraceContext;
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

export function buildSubAgentPrompt(role: string, instructions: string, timeZone?: string): string {
	return `${SUB_AGENT_PROTOCOL}
${getDateTimeSection(timeZone)}

You are a sub-agent with the role: ${role}.

## Task
${instructions}`;
}

export function createSubAgent(options: SubAgentOptions): Agent {
	const { role, instructions, tools, modelId, traceRun, timeZone } = options;

	const systemPrompt = buildSubAgentPrompt(role, instructions, timeZone);

	const agent = new Agent(`Sub-Agent: ${role}`)
		.model(modelId)
		.instructions(systemPrompt, {
			providerOptions: {
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
		})
		.tool(toolRegistryValues(tools))
		.checkpoint(options.checkpointStore ?? 'memory');
	const telemetry = options.tracing?.getTelemetry?.({
		agentRole: role,
		functionId: `instance-ai.subagent.${role.replace(/[^a-zA-Z0-9._-]+/g, '-')}`,
		executionMode:
			options.tracing.traceKind === 'background_subagent' ? 'background_subagent' : 'background',
		metadata: { agent_id: options.agentId },
	});
	if (telemetry) {
		agent.telemetry(telemetry);
	}

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
