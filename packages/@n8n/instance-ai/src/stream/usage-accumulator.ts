import { z } from 'zod';

// ── Schema (source of truth) ────────────────────────────────────────────────

/**
 * Per-model token usage for credit billing. Discriminated on `type` so the
 * billing payload can grow to cover non-LLM resources (request counts,
 * durations) without changing this variant. `output` is the model's output
 * token count (already inclusive of reasoning tokens per the AI SDK).
 */
export const builderUsageItemSchema = z.object({
	type: z.literal('llmTokens'),
	model: z.string(),
	uncachedInput: z.number().min(0),
	cacheRead: z.number().min(0),
	cacheWrite: z.number().min(0),
	output: z.number().min(0),
});

export type BuilderUsageItem = z.infer<typeof builderUsageItemSchema>;

export const runTokenUsageSchema = z.object({
	promptTokens: z.number().int().min(0),
	completionTokens: z.number().int().min(0),
	totalTokens: z.number().int().min(0),
	/** Estimated cost in USD, summed from per-step `usage.cost` (models.dev pricing). */
	costUsd: z.number().min(0),
	/** Per-model token breakdown used for service-side credit conversion. */
	usage: z.array(builderUsageItemSchema).optional(),
});

export type RunTokenUsage = z.infer<typeof runTokenUsageSchema>;

/** Shape of the `finish` stream chunk emitted by the agent runtime. */
const finishChunkSchema = z.object({
	type: z.literal('finish'),
	// Stable n8n model id stamped by the runtime; optional so a chunk missing it
	// (older runtime, sub-paths) still parses and falls back to 'unknown'.
	model: z.string().optional(),
	usage: z
		.object({
			promptTokens: z.number().optional(),
			completionTokens: z.number().optional(),
			totalTokens: z.number().optional(),
			cost: z.number().optional(),
			inputTokenDetails: z
				.object({
					noCache: z.number().optional(),
					cacheRead: z.number().optional(),
					cacheWrite: z.number().optional(),
				})
				.optional(),
		})
		.optional(),
});

// ── Accumulator ─────────────────────────────────────────────────────────────

type PerModelTokens = {
	uncachedInput: number;
	cacheRead: number;
	cacheWrite: number;
	output: number;
};

/**
 * Accumulates token usage and cost from the agent runtime's `finish` stream
 * chunks. Instantiated per-stream, fed each raw chunk, and drained at the end.
 * A run emits one `finish` chunk per agent segment (one extra per resume), so
 * usage is summed across segments — flat aggregates for metrics, plus a
 * per-model breakdown for credit billing.
 */
export class UsageAccumulator {
	private promptTokens = 0;
	private completionTokens = 0;
	private totalTokens = 0;
	private costUsd = 0;
	private seen = false;
	private readonly perModel = new Map<string, PerModelTokens>();

	/** Feed a raw stream chunk. Only `finish` chunks carry usage; others are ignored. */
	observe(chunk: unknown): void {
		const parsed = finishChunkSchema.safeParse(chunk);
		if (!parsed.success || !parsed.data.usage) return;
		const { promptTokens, completionTokens, totalTokens, cost, inputTokenDetails } =
			parsed.data.usage;

		this.promptTokens += promptTokens ?? 0;
		this.completionTokens += completionTokens ?? 0;
		this.totalTokens += totalTokens ?? 0;
		this.costUsd += cost ?? 0;
		this.seen = true;

		const model = parsed.data.model ?? 'unknown';
		const entry = this.perModel.get(model) ?? {
			uncachedInput: 0,
			cacheRead: 0,
			cacheWrite: 0,
			output: 0,
		};
		// uncachedInput comes straight from the SDK's noCache figure (never derived by
		// subtraction). output already includes reasoning tokens (AI SDK semantics).
		entry.uncachedInput += Math.max(0, inputTokenDetails?.noCache ?? 0);
		entry.cacheRead += Math.max(0, inputTokenDetails?.cacheRead ?? 0);
		entry.cacheWrite += Math.max(0, inputTokenDetails?.cacheWrite ?? 0);
		entry.output += Math.max(0, completionTokens ?? 0);
		this.perModel.set(model, entry);
	}

	/** Whether any usage was observed. */
	hasUsage(): boolean {
		return this.seen;
	}

	/** Produce a usage summary. Safe to call multiple times (idempotent). */
	toUsage(): RunTokenUsage {
		const usage: BuilderUsageItem[] = [];
		for (const [model, e] of this.perModel) {
			// Skip models with no billable tokens (e.g. a finish chunk that carried
			// only a total) so they don't create spurious zero-credit claims.
			if (e.uncachedInput + e.cacheRead + e.cacheWrite + e.output > 0) {
				usage.push({ type: 'llmTokens', model, ...e });
			}
		}

		return {
			promptTokens: this.promptTokens,
			completionTokens: this.completionTokens,
			totalTokens: this.totalTokens,
			costUsd: this.costUsd,
			usage,
		};
	}
}
