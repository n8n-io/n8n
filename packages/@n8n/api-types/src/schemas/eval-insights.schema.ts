import { z } from 'zod';

import { Z } from '../zod-class';

/**
 * AI insights for an evaluation collection. Returned by
 * `POST /workflows/:workflowId/eval-collections/:id/insights` and rendered as
 * three takeaway cards (winner / regressions / suggested next) in the compare
 * view's hero section.
 *
 * The `status` field signals which generation path produced the response:
 *  - `ok` — LLM call succeeded and returned valid structured output.
 *  - `fallback` — LLM call failed or returned invalid output; insights were
 *    synthesised deterministically from raw per-version aggregates. The
 *    frontend should render the same UI but may surface a subtle "computed"
 *    indicator.
 *  - `error` — Generation could not be completed (e.g. collection has no
 *    runs to compare yet). Frontend shows a retry CTA.
 *
 * The schema is intentionally flat — nested entity types would deepen the
 * partial-entity inference graph the same way `TestRun` did (see TRUST-72
 * PR 1a). Labels are free-form strings supplied by the agent; the FE matches
 * them against version labels from the collection detail response.
 */

export const aiInsightsStatusSchema = z.enum(['ok', 'fallback', 'error']);
export type AiInsightsStatus = z.infer<typeof aiInsightsStatusSchema>;

const winnerSchema = z.object({
	versionLabel: z.string().min(1),
	headline: z.string().min(1).max(120),
	body: z.string().min(1).max(280),
});

const regressionSchema = z.object({
	versionLabel: z.string().min(1),
	metric: z.string().min(1),
	/** Percentage-point delta vs. the best version. Negative = regressed. */
	delta: z.number(),
	headline: z.string().min(1).max(120),
	body: z.string().min(1).max(280),
});

const suggestedNextSchema = z.object({
	headline: z.string().min(1).max(120),
	body: z.string().min(1).max(280),
	/** Structured statement of what experiment isolates. */
	hypothesis: z.string().min(1).max(280),
});

/** Strict shape the agent is expected to produce. Used to validate LLM output. */
export const aiInsightsPayloadSchema = z.object({
	winner: winnerSchema,
	regressions: z.array(regressionSchema),
	suggestedNext: suggestedNextSchema,
});

/** Full response envelope including metadata. */
export const aiInsightsResponseSchema = z.object({
	generatedAt: z.string(),
	modelUsed: z.string(),
	status: aiInsightsStatusSchema,
	insights: aiInsightsPayloadSchema,
});

export type AiInsightsWinner = z.infer<typeof winnerSchema>;
export type AiInsightsRegression = z.infer<typeof regressionSchema>;
export type AiInsightsSuggestedNext = z.infer<typeof suggestedNextSchema>;
export type AiInsightsPayload = z.infer<typeof aiInsightsPayloadSchema>;
export type AiInsightsResponse = z.infer<typeof aiInsightsResponseSchema>;

// Optional request body for the insights endpoint. The only knob users
// currently have is `forceRegenerate` — bypass any cached envelope and
// re-compute. With the cache also busting on membership / completion
// changes, this is primarily a manual-override / "regenerate" UI hook
// rather than a workaround for stale data.
const generateInsightsShape = {
	forceRegenerate: z.boolean().optional(),
};

export const generateInsightsSchema = z.object(generateInsightsShape);
export type GenerateInsightsPayload = z.infer<typeof generateInsightsSchema>;

export class GenerateInsightsDto extends Z.class(generateInsightsShape) {}
