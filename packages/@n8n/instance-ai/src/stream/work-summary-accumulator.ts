import type { InstanceAiEvent } from '@n8n/api-types';
import { z } from 'zod';

import { DOMAIN_TOOL_IDS } from '../tools/tool-ids';

// ── Schema (source of truth) ────────────────────────────────────────────────

export const toolCallSummarySchema = z.object({
	toolCallId: z.string(),
	toolName: z.string(),
	/**
	 * The call's `action`, when it had one. Several tools are a single name over a
	 * discriminated union — `activity` covers `list` and `expand`, `workflows` covers
	 * `node-usage` and `get` — so the name alone cannot say what was asked for.
	 */
	action: z.string().optional(),
	/**
	 * Whether the call narrowed by node type. There are two ways to reach the node-usage
	 * index — the `node-usage` action, and the `nodeTypes` filter on `list` — and one flag
	 * gates both, so the rung derivation has to see both. The action alone shows only one.
	 *
	 * A flag rather than the args themselves: this summary is persisted, and the node types
	 * a user asked about are not worth keeping to answer a yes/no question.
	 *
	 * Set only for the `workflows` tool. Other tools take a required `nodeTypes` argument
	 * that means something else, and recording it for them would make this field's name
	 * describe the wrong thing on its most frequent caller.
	 */
	filteredByNodeTypes: z.literal(true).optional(),
	succeeded: z.boolean(),
	configMutated: z.literal(true).optional(),
	errorSummary: z.string().optional(),
});

export const workSummarySchema = z.object({
	toolCalls: z.array(toolCallSummarySchema),
	totalToolCalls: z.number().int().min(0),
	totalToolErrors: z.number().int().min(0),
	/**
	 * Whether the turn put a question back to the user instead of proceeding. Counted
	 * from confirmation requests that ask for an answer, not for approval: an approval
	 * prompt is the agent telling you what it is about to do, which is not the same
	 * act as not knowing.
	 */
	askedClarifyingQuestion: z.boolean(),
});

export type ToolCallSummary = z.infer<typeof toolCallSummarySchema>;
export type WorkSummary = z.infer<typeof workSummarySchema>;

function hasConfigMutationMarker(result: unknown): boolean {
	return (
		typeof result === 'object' &&
		result !== null &&
		'configMutated' in result &&
		result.configMutated === true
	);
}

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

	private askedClarifyingQuestion = false;

	/** Feed an event from the stream. Only tool-call / tool-result / tool-error
	 *  events are processed; all others are silently ignored. */
	observe(event: InstanceAiEvent): void {
		switch (event.type) {
			case 'tool-call': {
				const { toolCallId, toolName, args } = event.payload;
				if (!toolCallId) break;
				const action = typeof args?.action === 'string' ? args.action : undefined;
				const filteredByNodeTypes =
					toolName === DOMAIN_TOOL_IDS.WORKFLOWS &&
					Array.isArray(args?.nodeTypes) &&
					args.nodeTypes.length > 0;
				this.calls.set(toolCallId, {
					toolCallId,
					toolName,
					...(action !== undefined ? { action } : {}),
					...(filteredByNodeTypes ? { filteredByNodeTypes: true as const } : {}),
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
					if (hasConfigMutationMarker(event.payload.result)) {
						existing.configMutated = true;
					} else {
						delete existing.configMutated;
					}
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
			case 'confirmation-request': {
				// `questions` is the structured Q&A wizard; `text` is a free-form ask. Both are
				// the agent stopping to be told something. Every other input type is an approval.
				const { inputType } = event.payload;
				if (inputType === 'questions' || inputType === 'text') {
					this.askedClarifyingQuestion = true;
				}
				break;
			}
			default:
				// Ignore text-delta, reasoning-delta, error, etc.
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
			askedClarifyingQuestion: this.askedClarifyingQuestion,
		};
	}
}
