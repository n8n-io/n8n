import '../../openapi-extend';

import { z } from 'zod';

import {
	llmBudgetActionSchema,
	llmBudgetMetricSchema,
	llmBudgetTargetSchema,
	llmBudgetWindowSchema,
} from '../../schemas/llm-budget.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

export const llmBudgetIdParamSchema = z.string().min(1).max(36);

/** What a client writes. A `GET` body without `id` and the timestamps is a valid `PUT` body. */
const writableFields = {
	name: z.string().min(1).max(128),
	enabled: z.boolean().default(true),
	target: llmBudgetTargetSchema.openapi({
		description:
			'Dimension name to filter. `{ match: "all" }` gives each value its own counter; `{ match: "ids", ids }` only these values. A credential value is a credential ID, or `managed:aiGateway` for Gateway credits.',
	}),
	window: llmBudgetWindowSchema,
	metric: llmBudgetMetricSchema.default('costUsd'),
	limit: z.number().positive().openapi({ description: 'The limit in the unit of `metric`.' }),
	action: llmBudgetActionSchema
		.default('block')
		.openapi({ description: '`block` stops calls at the limit. `warn` only emits events.' }),
	warnAtPercent: z
		.array(z.number().int().min(1).max(100))
		.max(5)
		.default([80])
		.openapi({ description: 'Each threshold emits one log-streaming event when it is crossed.' }),
	managedBy: z
		.string()
		.max(32)
		.nullable()
		.default(null)
		.openapi({ description: 'The system that owns the budget, for example `lighthouse`.' }),
	externalId: z.string().max(255).nullable().default(null),
};

export class CreateLlmBudgetPublicDto extends Z.class(writableFields, { strict: true }) {}

export class UpdateLlmBudgetPublicDto extends Z.class(
	{
		...writableFields,
		version: z
			.number()
			.int()
			.min(1)
			.openapi({ description: 'The version that was read. A newer stored version gives 409.' }),
	},
	{ strict: true },
) {}

export class ListLlmBudgetsQueryPublicDto extends Z.class(
	{ limit: publicApiPaginationSchema.limit, cursor: z.string().optional() },
	{ strict: true },
) {}

const llmBudgetPublicSchema = z.object({
	id: z.string(),
	...writableFields,
	version: z.number(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export class LlmBudgetPublicDto extends Z.class(llmBudgetPublicSchema.shape) {}

export class LlmBudgetListPublicDto extends Z.class({
	data: z.array(llmBudgetPublicSchema),
	nextCursor: z.string().nullable(),
}) {}

const llmBudgetCounterPublicSchema = z.object({
	key: z.string().openapi({ description: 'The values of the counter, for example `user=<id>`.' }),
	spent: z.number(),
	percent: z.number(),
	unpricedCalls: z
		.number()
		.openapi({ description: 'Calls without a price. They count as 0 in `spent`.' }),
});

export class LlmBudgetStatusPublicDto extends Z.class({
	data: z.array(llmBudgetCounterPublicSchema),
	nextCursor: z.string().nullable(),
}) {}
