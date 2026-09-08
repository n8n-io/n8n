import { z } from 'zod';

import { Z } from '../zod-class';

/**
 * AI insights for an evaluation collection — winner, regressions, and a
 * suggested next experiment, rendered as three takeaway cards in the
 * compare view.
 *
 * `status` flags the generation path:
 *  - `ok`       — LLM produced valid structured output.
 *  - `fallback` — deterministic summary from raw aggregates.
 *  - `error`    — generation could not be completed.
 */

export const aiInsightsStatusSchema = z.enum(['ok', 'fallback', 'error']);
export type AiInsightsStatus = z.infer<typeof aiInsightsStatusSchema>;

// `.strict()` on every object: unknown keys are rejected rather than
// stripped. Forces agent output to match the shape exactly and forces
// older cached envelopes to fail-and-regenerate instead of silently
// losing fields.
// Bounded so a drifting model can't emit unbounded strings from a prompt that
// carries untrusted workflow content; the caps match the system-prompt limits.
const HEADLINE_MAX = 120;
const BODY_MAX = 280;
const LABEL_MAX = 8;
const METRIC_MAX = 120;

const winnerSchema = z
	.object({
		versionLabel: z.string().min(1).max(LABEL_MAX),
		headline: z.string().min(1).max(HEADLINE_MAX),
		body: z.string().min(1).max(BODY_MAX),
	})
	.strict();

const regressionSchema = z
	.object({
		versionLabel: z.string().min(1).max(LABEL_MAX),
		metric: z.string().min(1).max(METRIC_MAX),
		/** Percentage-point delta vs. the winner. Negative = regression. */
		delta: z.number(),
		headline: z.string().min(1).max(HEADLINE_MAX),
		body: z.string().min(1).max(BODY_MAX),
	})
	.strict();

const suggestedNextSchema = z
	.object({
		headline: z.string().min(1).max(HEADLINE_MAX),
		body: z.string().min(1).max(BODY_MAX),
		hypothesis: z.string().min(1).max(BODY_MAX),
	})
	.strict();

export const aiInsightsPayloadSchema = z
	.object({
		winner: winnerSchema,
		regressions: z.array(regressionSchema),
		suggestedNext: suggestedNextSchema,
	})
	.strict();

export const aiInsightsResponseSchema = z
	.object({
		generatedAt: z.string(),
		modelUsed: z.string(),
		status: aiInsightsStatusSchema,
		insights: aiInsightsPayloadSchema,
	})
	.strict();

export type AiInsightsWinner = z.infer<typeof winnerSchema>;
export type AiInsightsRegression = z.infer<typeof regressionSchema>;
export type AiInsightsSuggestedNext = z.infer<typeof suggestedNextSchema>;
export type AiInsightsPayload = z.infer<typeof aiInsightsPayloadSchema>;
export type AiInsightsResponse = z.infer<typeof aiInsightsResponseSchema>;

const generateInsightsShape = {
	forceRegenerate: z.boolean().optional(),
};

export const generateInsightsSchema = z.object(generateInsightsShape);
export type GenerateInsightsPayload = z.infer<typeof generateInsightsSchema>;

export class GenerateInsightsDto extends Z.class(generateInsightsShape) {}
