import { z } from 'zod';

export const insightsSummaryTypeSchema = z.enum([
	'total',
	'failed',
	'failureRate',
	'timeSaved',
	'averageRunTime',
]);
export type InsightsSummaryType = z.infer<typeof insightsSummaryTypeSchema>;

export const insightsSummaryUnitSchema = z.enum(['count', 'ratio', 'millisecond', 'minute']);
export type InsightsSummaryUnit = z.infer<typeof insightsSummaryUnitSchema>;

export const insightsSummaryDataSchemas = {
	total: z.object({
		value: z.number(),
		deviation: z.union([z.null(), z.number()]),
		unit: z.literal('count'),
	}),
	failed: z.object({
		value: z.number(),
		deviation: z.union([z.null(), z.number()]),
		unit: z.literal('count'),
	}),
	failureRate: z.object({
		value: z.number(),
		deviation: z.union([z.null(), z.number()]),
		unit: z.literal('ratio'),
	}),
	timeSaved: z.object({
		value: z.number(),
		deviation: z.union([z.null(), z.number()]),
		unit: z.literal('minute'),
	}),
	averageRunTime: z.object({
		value: z.number(),
		deviation: z.union([z.null(), z.number()]),
		unit: z.literal('millisecond'),
	}),
} as const;

export const insightsSummarySchema = z.object(insightsSummaryDataSchemas).strict();
export type InsightsSummary = z.infer<typeof insightsSummarySchema>;

export const insightsByWorkflowDataSchemas = {
	count: z.number(),
	data: z.array(
		z
			.object({
				// Workflow id will be null if the workflow has been deleted
				workflowId: z.string().nullable(),
				workflowName: z.string(),
				// Project id will be null if the project has been deleted
				projectId: z.string().nullable(),
				projectName: z.string(),
				total: z.number(),
				succeeded: z.number(),
				failed: z.number(),
				failureRate: z.number(),
				runTime: z.number(),
				averageRunTime: z.number(),
				timeSaved: z.number(),
			})
			.strict(),
	),
} as const;

export const insightsByWorkflowSchema = z.object(insightsByWorkflowDataSchemas).strict();
export type InsightsByWorkflow = z.infer<typeof insightsByWorkflowSchema>;

export const insightsByTimeDataSchemas = {
	date: z.string().refine((val) => !isNaN(Date.parse(val)) && new Date(val).toISOString() === val, {
		message: 'Invalid date format, must be ISO 8601 format',
	}),
	values: z
		.object({
			total: z.number(),
			succeeded: z.number(),
			failed: z.number(),
			failureRate: z.number(),
			averageRunTime: z.number(),
			timeSaved: z.number(),
		})
		.strict(),
} as const;
export const insightsByTimeSchema = z.object(insightsByTimeDataSchemas).strict();
export type InsightsByTime = z.infer<typeof insightsByTimeSchema>;

export const restrictedInsightsByTimeDataSchema = {
	date: z.string().refine((val) => !isNaN(Date.parse(val)) && new Date(val).toISOString() === val, {
		message: 'Invalid date format, must be ISO 8601 format',
	}),
	values: z
		.object({
			timeSaved: z.number(),
		})
		.strict(),
} as const;
export const restrictedInsightsByTimeSchema = z.object(restrictedInsightsByTimeDataSchema).strict();
export type RestrictedInsightsByTime = z.infer<typeof restrictedInsightsByTimeSchema>;

export const insightsDateRangeSchema = z
	.object({
		key: z.enum(['day', 'week', '2weeks', 'month', 'quarter', '6months', 'year']),
		licensed: z.boolean(),
		granularity: z.enum(['hour', 'day', 'week']),
	})
	.strict();
export type InsightsDateRange = z.infer<typeof insightsDateRangeSchema>;

export const insightsAnalystChatModeSchema = z.enum(['llm', 'fallback']);
export type InsightsAnalystChatMode = z.infer<typeof insightsAnalystChatModeSchema>;

export const insightsAnalystCitationSchema = z
	.object({
		workflowId: z.string(),
		workflowName: z.string(),
		metric: z.string(),
		value: z.number(),
		unit: insightsSummaryUnitSchema,
	})
	.strict();
export type InsightsAnalystCitation = z.infer<typeof insightsAnalystCitationSchema>;

export const insightsAnalystHighlightSchema = z
	.object({
		id: z.string(),
		title: z.string(),
		workflowId: z.string(),
		workflowName: z.string(),
		description: z.string(),
		trend: z.enum(['positive', 'negative', 'neutral']),
		value: z.number(),
		unit: insightsSummaryUnitSchema,
	})
	.strict();
export type InsightsAnalystHighlight = z.infer<typeof insightsAnalystHighlightSchema>;

export const insightsAnalystLowImpactWorkflowSchema = z
	.object({
		workflowId: z.string(),
		workflowName: z.string(),
		description: z.string(),
		timeSaved: z.number(),
		total: z.number(),
	})
	.strict();
export type InsightsAnalystLowImpactWorkflow = z.infer<
	typeof insightsAnalystLowImpactWorkflowSchema
>;

export const insightsAnalystOverviewSchema = z
	.object({
		project: z
			.object({
				id: z.string(),
				name: z.string(),
			})
			.strict(),
		dateRange: z
			.object({
				startDate: z.string(),
				endDate: z.string(),
			})
			.strict(),
		summary: insightsSummarySchema,
		byTime: z.array(insightsByTimeSchema),
		byWorkflow: insightsByWorkflowSchema,
		highlights: z.array(insightsAnalystHighlightSchema),
		lowImpactWorkflows: z.array(insightsAnalystLowImpactWorkflowSchema),
		suggestedPrompts: z.array(z.string()),
	})
	.strict();
export type InsightsAnalystOverview = z.infer<typeof insightsAnalystOverviewSchema>;

export const insightsAnalystChatRequestSchema = z
	.object({
		question: z.string().trim().min(1).max(1_000),
	})
	.strict();
export type InsightsAnalystChatRequest = z.infer<typeof insightsAnalystChatRequestSchema>;

export const insightsAnalystChatResponseSchema = z
	.object({
		answer: z.string(),
		mode: insightsAnalystChatModeSchema,
		citations: z.array(insightsAnalystCitationSchema),
	})
	.strict();
export type InsightsAnalystChatResponse = z.infer<typeof insightsAnalystChatResponseSchema>;
