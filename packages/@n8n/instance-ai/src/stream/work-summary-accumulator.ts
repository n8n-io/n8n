import type { InstanceAiEvent } from '@n8n/api-types';
import { z } from 'zod';

// ── Schema (source of truth) ────────────────────────────────────────────────

export const toolCallSummarySchema = z.object({
	toolCallId: z.string(),
	toolName: z.string(),
	succeeded: z.boolean(),
	errorSummary: z.string().optional(),
});

export const workSummarySchema = z.object({
	toolCalls: z.array(toolCallSummarySchema),
	totalToolCalls: z.number().int().min(0),
	totalToolErrors: z.number().int().min(0),
});

export type ToolCallSummary = z.infer<typeof toolCallSummarySchema>;
export type WorkSummary = z.infer<typeof workSummarySchema>;

// ── Accumulator ─────────────────────────────────────────────────────────────

/**
 * Lightweight observer that accumulates tool call outcomes from stream events.
 * Instantiated per-stream in `executeResumableStream`, fed each mapped event,
 * and drained at the end to produce a {@link WorkSummary}.
 *
 * Keyed by `toolCallId` — duplicate IDs (e.g. from resumed streams) are
 * de-duplicated by keeping the latest outcome.
 */
export class WorkSummaryAccumulator {
	private readonly calls = new Map<string, ToolCallSummary>();

	/** Feed an event from the stream. Only tool-call / tool-result / tool-error
	 *  events are processed; all others are silently ignored. */
	observe(event: InstanceAiEvent): void {
		switch (event.type) {
			case 'tool-call': {
				const { toolCallId, toolName } = event.payload;
				if (!toolCallId) break;
				this.calls.set(toolCallId, {
					toolCallId,
					toolName,
					succeeded: true, // optimistic — flipped on error
				});
				break;
			}
			case 'tool-result': {
				const { toolCallId } = event.payload;
				if (!toolCallId) break;
				const existing = this.calls.get(toolCallId);
				if (existing) {
					existing.succeeded = true;
				}
				break;
			}
			case 'tool-error': {
				const { toolCallId, error } = event.payload;
				if (!toolCallId) break;
				const existing = this.calls.get(toolCallId);
				if (existing) {
					existing.succeeded = false;
					existing.errorSummary = typeof error === 'string' ? error.slice(0, 500) : undefined;
				}
				break;
			}
			default:
				// Ignore text-delta, reasoning-delta, confirmation-request, error, etc.
				break;
		}
	}

	/** Produce a frozen summary. Safe to call multiple times (idempotent). */
	toSummary(): WorkSummary {
		const toolCalls = [...this.calls.values()].map((c) => ({ ...c }));
		return {
			toolCalls,
			totalToolCalls: toolCalls.length,
			totalToolErrors: toolCalls.filter((c) => !c.succeeded).length,
		};
	}
}
