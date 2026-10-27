import { z } from 'zod';

/** What a budget can target. The credential value is a credential ID, or `managed:aiGateway`. */
export const LLM_BUDGET_DIMENSIONS = [
	'workflow',
	'agent',
	'project',
	'user',
	'credential',
] as const;
export type LlmBudgetDimension = (typeof LLM_BUDGET_DIMENSIONS)[number];

/**
 * `all`: each value has its own counter. `ids`: only these values, each with its own counter.
 * An object, not a string, so a later grouping option fits without an API break.
 */
export const llmBudgetDimensionFilterSchema = z.discriminatedUnion('match', [
	z.object({ match: z.literal('all') }).strict(),
	z.object({ match: z.literal('ids'), ids: z.array(z.string().min(1)).min(1) }).strict(),
]);
export type LlmBudgetDimensionFilter = z.infer<typeof llmBudgetDimensionFilterSchema>;

/** A dimension that is not set matches every call. At least one must be set. */
export const llmBudgetTargetSchema = z
	.object({
		workflow: llmBudgetDimensionFilterSchema.optional(),
		agent: llmBudgetDimensionFilterSchema.optional(),
		project: llmBudgetDimensionFilterSchema.optional(),
		user: llmBudgetDimensionFilterSchema.optional(),
		credential: llmBudgetDimensionFilterSchema.optional(),
	})
	.strict()
	.refine((target) => Object.values(target).some(Boolean), {
		message: 'Set at least one target dimension',
	});
export type LlmBudgetTarget = z.infer<typeof llmBudgetTargetSchema>;

const windowUnitSchema = z.enum(['day', 'week', 'month']);

/** Rolling: the last 24 hours, 7 days or 30 days. Calendar: from the start of the day, week or month. */
export const llmBudgetWindowSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('rolling'), unit: windowUnitSchema }).strict(),
	z
		.object({
			kind: z.literal('calendar'),
			unit: windowUnitSchema,
			timezone: z.enum(['instance', 'UTC']).optional(),
		})
		.strict(),
]);
export type LlmBudgetWindow = z.infer<typeof llmBudgetWindowSchema>;

export const llmBudgetMetricSchema = z.enum(['costUsd']);
export type LlmBudgetMetric = z.infer<typeof llmBudgetMetricSchema>;

/** `block` stops calls at the limit. `warn` only emits events, for a monitor-only rollout. */
export const llmBudgetActionSchema = z.enum(['block', 'warn']);
export type LlmBudgetAction = z.infer<typeof llmBudgetActionSchema>;
