import {
	INSTANCE_CONTEXT_SURFACE_DEPTH,
	type InstanceContextInjection,
	type InstanceContextReach,
} from '@n8n/api-types';
import type { TelemetryProxy } from '@n8n/backend-services';
import type { RunTokenUsage, WorkSummary } from '@n8n/instance-ai';
import { TELEMETRY_EVENT, type AssistantRuntime } from '@n8n/telemetry';

import type { InstanceAiSkillTelemetry } from './instance-ai-skill-telemetry';

/** Use a fixed estimate to avoid loading a tokenizer on every turn. */
const BLOCK_CHARS_PER_TOKEN = 4;

/** The identity, gate results and injection that all segments of one turn share. */
export interface InstanceContextTurn {
	runtime: AssistantRuntime;
	skills?: InstanceAiSkillTelemetry;
	userId: string;
	threadId: string;
	runId: string;
	injection: InstanceContextInjection;
	instanceContextEnabled: boolean;
	nodeUsageEnabled: boolean;
}

export interface InstanceContextTurnSegment {
	/** A turn can suspend more than once. Aggregate segments by run ID. */
	segment: 'whole' | 'suspended' | 'resumed';
	status: 'completed' | 'cancelled' | 'errored' | 'suspended';
	reach: InstanceContextReach;
	workSummary?: WorkSummary;
	/** Measured usage for this segment, not the estimated block size. */
	usage?: Pick<RunTokenUsage, 'promptTokens' | 'completionTokens' | 'totalTokens'> &
		Partial<Pick<RunTokenUsage, 'costUsd'>>;
}

/**
 * Sends "Instance AI instance-context turn completed" for one turn segment.
 * Both Assistant runtimes use this, so the properties stay the same.
 */
export function trackInstanceContextTurn(
	telemetry: TelemetryProxy,
	turn: InstanceContextTurn,
	input: InstanceContextTurnSegment,
): void {
	const { injection } = turn;
	telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.INSTANCE_CONTEXT_TURN, {
		...turn.skills?.snapshot(),
		user_id: turn.userId,
		thread_id: turn.threadId,
		run_id: turn.runId,
		surface: 'aia',
		runtime: turn.runtime,
		segment: input.segment,
		instance_context_enabled: turn.instanceContextEnabled,
		node_usage_enabled: turn.nodeUsageEnabled,
		...(injection.state === 'absent'
			? { block_state: injection.state, absence_reason: injection.reason }
			: {
					block_state: injection.state,
					block_is_update: injection.isUpdate,
					block_inventory_rows: injection.legs.inventory,
					block_event_rows: injection.legs.events,
					block_run_rows: injection.legs.runs,
					block_chars: injection.chars,
					// The block is not tokenized separately. Report an estimate beside its exact length.
					block_tokens_estimated: Math.ceil(injection.chars / BLOCK_CHARS_PER_TOKEN),
				}),
		// Derived here rather than shipped: the depth is a function of the surfaces, and
		// the map that defines it is in scope at the only place that needs a number.
		context_depth: input.reach.surfaces.reduce(
			(deepest, surface) => Math.max(deepest, INSTANCE_CONTEXT_SURFACE_DEPTH[surface]),
			0,
		),
		context_surfaces: input.reach.surfaces,
		asked_clarifying_question: input.workSummary?.askedClarifyingQuestion ?? false,
		tool_calls: input.workSummary?.totalToolCalls ?? 0,
		// A suspended turn spends tokens in each segment, so these are per segment and
		// sum over the shared `run_id`. Absent when the segment reported no usage.
		...(input.usage
			? {
					turn_prompt_tokens: input.usage.promptTokens,
					turn_completion_tokens: input.usage.completionTokens,
					turn_total_tokens: input.usage.totalTokens,
					turn_cost_usd: input.usage.costUsd,
				}
			: {}),
		status: input.status,
	});
}
