import { withPromptSizeBreakdown, type TokenUsage } from '@n8n/agents';
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
	/**
	 * Largest prompt among the model calls in this item. The service bills
	 * models that cost more for long prompts by it. Absent when the run did not
	 * report a prompt-size split, so the service bills at the highest rate.
	 */
	maxPromptTokens: z.number().int().min(0).optional(),
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

const tokenCountsSchema = z.object({
	promptTokens: z.number().optional(),
	completionTokens: z.number().optional(),
	inputTokenDetails: z
		.object({
			noCache: z.number().optional(),
			cacheRead: z.number().optional(),
			cacheWrite: z.number().optional(),
		})
		.optional(),
});

type TokenCounts = z.infer<typeof tokenCountsSchema>;

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
			byPromptSize: z
				.array(
					z.object({
						promptTokensOver: z.number(),
						maxPromptTokens: z.number(),
						usage: tokenCountsSchema,
					}),
				)
				.optional(),
		})
		.optional(),
});

// ── Accumulator ─────────────────────────────────────────────────────────────

type PerModelTokens = {
	model: string;
	/** Undefined when the usage came without a prompt-size split. */
	maxPromptTokens: number | undefined;
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
 * per-model breakdown for credit billing. The breakdown keeps the runtime's
 * prompt-size buckets apart, so the service can bill each at its own rate.
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
		const { promptTokens, completionTokens, totalTokens, cost, byPromptSize } = parsed.data.usage;

		this.promptTokens += promptTokens ?? 0;
		this.completionTokens += completionTokens ?? 0;
		this.totalTokens += totalTokens ?? 0;
		this.costUsd += cost ?? 0;
		this.seen = true;

		const model = parsed.data.model ?? 'unknown';
		if (byPromptSize && byPromptSize.length > 0) {
			for (const bucket of byPromptSize) {
				this.addTokens(model, bucket, bucket.usage);
			}
		} else {
			this.addTokens(model, undefined, parsed.data.usage);
		}
	}

	private addTokens(
		model: string,
		bucket: { promptTokensOver: number; maxPromptTokens: number } | undefined,
		counts: TokenCounts,
	): void {
		const key = `${model}\u0000${bucket?.promptTokensOver ?? 'unsplit'}`;
		const entry = this.perModel.get(key) ?? {
			model,
			maxPromptTokens: undefined,
			uncachedInput: 0,
			cacheRead: 0,
			cacheWrite: 0,
			output: 0,
		};
		if (bucket) {
			entry.maxPromptTokens = Math.max(entry.maxPromptTokens ?? 0, bucket.maxPromptTokens);
		}
		// uncachedInput comes straight from the SDK's noCache figure (never derived by
		// subtraction) when the provider supplied a usable cache breakdown. When it
		// didn't (e.g. uncached OpenAI usage, which reports only an aggregate prompt
		// count), fall back to promptTokens so input tokens are still billed instead
		// of silently dropped. output already includes reasoning tokens (AI SDK semantics).
		const { promptTokens, completionTokens, inputTokenDetails } = counts;
		const noCache = Math.max(0, inputTokenDetails?.noCache ?? 0);
		const cacheRead = Math.max(0, inputTokenDetails?.cacheRead ?? 0);
		const cacheWrite = Math.max(0, inputTokenDetails?.cacheWrite ?? 0);
		const hasUsableBreakdown = noCache + cacheRead + cacheWrite > 0;
		entry.uncachedInput += hasUsableBreakdown ? noCache : Math.max(0, promptTokens ?? 0);
		entry.cacheRead += cacheRead;
		entry.cacheWrite += cacheWrite;
		entry.output += Math.max(0, completionTokens ?? 0);
		this.perModel.set(key, entry);
	}

	/** Whether any usage was observed. */
	hasUsage(): boolean {
		return this.seen;
	}

	/** Produce a usage summary. Safe to call multiple times (idempotent). */
	toUsage(): RunTokenUsage {
		const usage: BuilderUsageItem[] = [];
		for (const { model, maxPromptTokens, ...tokens } of this.perModel.values()) {
			// Skip models with no billable tokens (e.g. a finish chunk that carried
			// only a total) so they don't create spurious zero-credit claims.
			if (tokens.uncachedInput + tokens.cacheRead + tokens.cacheWrite + tokens.output > 0) {
				usage.push({
					type: 'llmTokens',
					model,
					...tokens,
					...(maxPromptTokens !== undefined && { maxPromptTokens }),
				});
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

/**
 * Map a single LLM call's token usage to billable items by replaying it
 * through the accumulator, so one-off claims (observational-memory
 * observer/reflector calls) use the exact same billing semantics as
 * finish-chunk stream usage. The usage is one call, so its prompt size is exact.
 */
export function tokenUsageToBuilderUsageItems(
	model: string,
	usage: TokenUsage,
): BuilderUsageItem[] {
	const accumulator = new UsageAccumulator();
	accumulator.observe({ type: 'finish', model, usage: withPromptSizeBreakdown(usage) });
	return accumulator.toUsage().usage ?? [];
}
