import {
	INLINE_SUB_AGENT_ID,
	type DelegateSubAgentRequest,
	type DelegateSubAgentToolOutput,
} from '@n8n/agents';

import {
	buildSubAgentInstructions,
	getGeneralPurposeSubAgentDefinition,
	getSubAgentDefinition,
	isSelectableSubAgentId,
	listAvailableSubAgents,
	resolveSubAgentTools,
} from './registry';
import type { InstanceAiSubAgentDefinition } from './types';
import { runSyncSubAgent, type SyncSubAgentOutput } from '../tools/orchestration/sync-sub-agent';
import type { OrchestrationContext } from '../types';

export interface RunSubAgentDefinitionInput {
	briefing: string;
	conversationContext?: string;
	artifacts?: unknown;
}

/**
 * Shared executor: resolve a definition's tools and instructions, then run it
 * via {@link runSyncSubAgent}. Used by {@link runInstanceAiSubAgent} below for
 * delegate-tool routing, and directly by `discover-workflow-context` (which
 * resolves `workflow-context-scout` itself, bypassing delegate-id selection —
 * see `isSelectableSubAgentId`).
 */
export async function runSubAgentDefinition(
	definition: InstanceAiSubAgentDefinition,
	input: RunSubAgentDefinitionInput,
	context: OrchestrationContext,
): Promise<SyncSubAgentOutput> {
	const { tools, toolNames } = resolveSubAgentTools(definition, context);

	return await runSyncSubAgent(context, {
		role: definition.id,
		instructions: buildSubAgentInstructions(definition),
		briefing: input.briefing,
		validTools: tools,
		toolNames,
		artifacts: input.artifacts,
		conversationContext: input.conversationContext,
		maxIterations: definition.maxSteps,
	});
}

function resolveDelegatedDefinition(subAgentId: string): InstanceAiSubAgentDefinition | undefined {
	if (subAgentId === INLINE_SUB_AGENT_ID) return getGeneralPurposeSubAgentDefinition();
	if (!isSelectableSubAgentId(subAgentId)) return undefined;
	return getSubAgentDefinition(subAgentId);
}

/** Render the delegate tool's goal/context/expectedOutput into a sync sub-agent briefing. */
function buildDelegateBriefing(request: DelegateSubAgentRequest): string {
	const sections = [request.goal];
	if (request.expectedOutput) {
		sections.push('', `Expected output: ${request.expectedOutput}`);
	}
	return sections.join('\n');
}

function unknownSubAgentError(subAgentId: string): string {
	const ids = listAvailableSubAgents().map((entry) => entry.id);
	return `No configured subagent matched "${subAgentId}". Use "inline" for the default sub-agent, or one of: ${ids.join(', ')}.`;
}

/**
 * `runSubAgent` callback for the `agent` delegate tool (see
 * `createInstanceAgent` in `agent/instance-agent.ts`). Every `subAgentId` —
 * including `"inline"` — routes here and runs through the existing
 * `runSyncSubAgent` machinery, so UI events, LangSmith tracing, and HITL all
 * keep working with no SDK inline-runner and no stream bridge. `difficulty`
 * is accepted by the tool schema but intentionally ignored in v1 — every
 * definition runs on the subagent model (see `docs/subagents.md`).
 *
 * HITL: a definition with `hitl: 'allowed'` would need `runSyncSubAgent`'s
 * existing suspend/resume flow to resolve internally so this never returns
 * `status: 'suspended'` (the SDK delegate tool fails fast on child
 * suspension). No v1 built-in sets `hitl: 'allowed'`, so this is not
 * exercised yet — revisit before adding one that does.
 */
export async function runInstanceAiSubAgent(
	request: DelegateSubAgentRequest,
	context: OrchestrationContext,
): Promise<DelegateSubAgentToolOutput> {
	const definition = resolveDelegatedDefinition(request.subAgentId);
	if (!definition) {
		return {
			status: 'failed',
			taskPath: request.taskPath,
			answer: '',
			error: unknownSubAgentError(request.subAgentId),
		};
	}

	const output = await runSubAgentDefinition(
		definition,
		{
			briefing: buildDelegateBriefing(request),
			conversationContext: request.context,
		},
		context,
	);

	return {
		status: 'completed',
		taskPath: request.taskPath,
		answer: output.result,
		...(output.usage ? { usage: output.usage } : {}),
	};
}
