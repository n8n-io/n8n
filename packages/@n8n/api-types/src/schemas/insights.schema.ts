import { z } from 'zod';

export const insightsSummaryTypeSchema = z.enum([
	'total',
	'failed',
	'failureRate',
	'timeSaved',
	'avgRunTime',
]);
export type InsightsSummaryType = z.infer<typeof insightsSummaryTypeSchema>;

export const insightsSummaryUnitSchema = z.enum(['count', 'ratio', 'time']);
export type InsightsSummaryUnit = z.infer<typeof insightsSummaryUnitSchema>;

export const insightsSummaryDataSchemas = {
	total: z.object({
		value: z.number(),
		deviation: z.number(),
		unit: z.literal('count'),
	}),
	failed: z.object({
		value: z.number(),
		deviation: z.number(),
		unit: z.literal('count'),
	}),
	failureRate: z.object({
		value: z.number(),
		deviation: z.number(),
		unit: z.literal('ratio'),
	}),
	timeSaved: z.object({
		value: z.number(),
		deviation: z.number(),
		unit: z.literal('time'),
	}),
	avgRunTime: z.object({
		value: z.number(),
		deviation: z.number(),
		unit: z.literal('time'),
	}),
} as const;

export const insightsSchema = z.object(insightsSummaryDataSchemas);
export type InsightsSummary = z.infer<typeof insightsSchema>;
