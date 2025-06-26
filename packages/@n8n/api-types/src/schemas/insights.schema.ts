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
				workflowId: z.string(),
				workflowName: z.string(),
				projectId: z.string(),
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
