import { z } from 'zod';

// ── Schema (source of truth) ────────────────────────────────────────────────

export const runTokenUsageSchema = z.object({
	promptTokens: z.number().int().min(0),
	completionTokens: z.number().int().min(0),
	totalTokens: z.number().int().min(0),
	/** Estimated cost in USD, summed from per-step `usage.cost` (models.dev pricing). */
	costUsd: z.number().min(0),
});

export type RunTokenUsage = z.infer<typeof runTokenUsageSchema>;

/** Shape of the `usage` field on the agent SDK's `finish` stream chunk. */
const finishChunkSchema = z.object({
	type: z.literal('finish'),
	usage: z
		.object({
			promptTokens: z.number().optional(),
			completionTokens: z.number().optional(),
			totalTokens: z.number().optional(),
			cost: z.number().optional(),
		})
		.optional(),
});

// ── Accumulator ─────────────────────────────────────────────────────────────

/**
 * Accumulates token usage and cost from the agent SDK's `finish` stream chunks.
 * Mirrors {@link WorkSummaryAccumulator}: instantiated per-stream, fed each raw
 * chunk, and drained at the end. A run emits one `finish` chunk per agent
 * segment (one extra per resume), so usage is summed across segments.
 */
export class UsageAccumulator {
	private promptTokens = 0;
	private completionTokens = 0;
	private totalTokens = 0;
	private costUsd = 0;
	private seen = false;

	/** Feed a raw stream chunk. Only `finish` chunks carry usage; others are ignored. */
	observe(chunk: unknown): void {
		const parsed = finishChunkSchema.safeParse(chunk);
		if (!parsed.success || !parsed.data.usage) return;
		const { promptTokens, completionTokens, totalTokens, cost } = parsed.data.usage;
		this.promptTokens += promptTokens ?? 0;
		this.completionTokens += completionTokens ?? 0;
		this.totalTokens += totalTokens ?? 0;
		this.costUsd += cost ?? 0;
		this.seen = true;
	}

	/** Whether any usage was observed. */
	hasUsage(): boolean {
		return this.seen;
	}

	/** Produce a usage summary. Safe to call multiple times (idempotent). */
	toUsage(): RunTokenUsage {
		return {
			promptTokens: this.promptTokens,
			completionTokens: this.completionTokens,
			totalTokens: this.totalTokens,
			costUsd: this.costUsd,
		};
	}
}
