import { z } from 'zod';

import { toolCallSummarySchema } from '../stream/work-summary-accumulator';
import type { WorkSummary } from '../stream/work-summary-accumulator';

// ── Schema (source of truth) ────────────────────────────────────────────────

export const subAgentDebriefingSchema = z.object({
	/** Unique sub-agent ID. */
	agentId: z.string(),
	/** Sub-agent role descriptor. */
	role: z.string(),
	/** Terminal status. */
	status: z.enum(['completed', 'failed', 'cancelled']),
	/** The agent's final text output. */
	result: z.string(),

	// ── Work summary (accumulated from stream observation) ────────────────
	/** Total number of tool invocations observed. */
	toolCallCount: z.number().int().min(0),
	/** Number of tool invocations that failed. */
	toolErrorCount: z.number().int().min(0),
	/** Per-tool call outcomes — omitted when empty to keep payloads lean. */
	toolCalls: z.array(toolCallSummarySchema).optional(),

	// ── Timing ────────────────────────────────────────────────────────────
	/** Wall-clock duration of the sub-agent run in milliseconds. */
	durationMs: z.number().optional(),

	// ── Diagnostic context ───────────────────────────────────────────────
	/** Why the agent stopped (e.g. "completed task", "blocked on credential", "retry limit"). */
	stoppingReason: z.string().optional(),
	/** Specific blockers encountered during execution. */
	blockers: z.array(z.string()).optional(),
});

export type SubAgentDebriefing = z.infer<typeof subAgentDebriefingSchema>;

// ── Builder ─────────────────────────────────────────────────────────────────

export interface BuildDebriefingInput {
	agentId: string;
	role: string;
	result: string;
	workSummary: WorkSummary;
	startTime: number;
	error?: string;
}

/**
 * Construct a {@link SubAgentDebriefing} from the host-observed work summary
 * and timing data. The sub-agent itself is stateless — this is built by the
 * caller (delegate tool, background task manager) after stream consumption.
 */
export function buildDebriefing(input: BuildDebriefingInput): SubAgentDebriefing {
	const { agentId, role, result, workSummary, startTime, error } = input;

	const status = error ? 'failed' : 'completed';
	const durationMs = Date.now() - startTime;

	// Extract blockers from tool errors
	const blockers = workSummary.toolCalls
		.filter((c) => !c.succeeded && c.errorSummary)
		.map((c) => `${c.toolName}: ${c.errorSummary}`);

	return {
		agentId,
		role,
		status,
		result,
		toolCallCount: workSummary.totalToolCalls,
		toolErrorCount: workSummary.totalToolErrors,
		...(workSummary.toolCalls.length > 0 ? { toolCalls: workSummary.toolCalls } : {}),
		durationMs,
		...(error ? { stoppingReason: error } : {}),
		...(blockers.length > 0 ? { blockers } : {}),
	};
}
