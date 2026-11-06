import { z } from 'zod';

import { Z } from '../../zod-class';
import { createTakeValidator, paginationSchema } from '../pagination/pagination.dto';

export const LLM_USAGE_GROUP_BY = [
	'workflow',
	'agent',
	'caller',
	'model',
	'project',
	'user',
	'mode',
] as const;

export type LlmUsageGroupBy = (typeof LLM_USAGE_GROUP_BY)[number];

/** The groups the summary ranks by estimated cost. */
export const LLM_USAGE_TOP_GROUPS = ['workflow', 'agent', 'model', 'caller', 'user'] as const;

export type LlmUsageTopGroup = (typeof LLM_USAGE_TOP_GROUPS)[number];

export const LLM_USAGE_CALL_SORT_KEYS = [
	'finishedAt',
	'name',
	'caller',
	'provider',
	'model',
	'estimatedCostUsd',
	'durationMs',
	'inputTokens',
	'outputTokens',
] as const;

export type LlmUsageCallSortKey = (typeof LLM_USAGE_CALL_SORT_KEYS)[number];

/** The ranges the page offers, in days. The longest one also bounds repricing. */
export const LLM_USAGE_RANGE_DAYS = [7, 30, 90] as const;

const days = z.coerce
	.number()
	.refine(
		(value) => LLM_USAGE_RANGE_DAYS.some((rangeDays) => rangeDays === value),
		'Must be 7, 30 or 90',
	)
	.default(30);

export class LlmUsageQueryDto extends Z.class({ days }) {}

export class LlmUsageCallsQueryDto extends Z.class({
	days,
	...paginationSchema,
	take: createTakeValidator(100, false, 25),
	sortBy: z.enum(LLM_USAGE_CALL_SORT_KEYS).default('finishedAt'),
	sortOrder: z.enum(['asc', 'desc']).default('desc'),
}) {}
