import { z } from 'zod';
import { Z } from 'zod-class';

export class ExpressionCategoriesResponseDto extends Z.class({
	success: z.boolean(),
	data: z.array(
		z.object({
			name: z.string(),
			description: z.string().optional(),
			functionCount: z.number().optional(),
		}),
	),
}) {}

export class ExpressionFunctionsCategoryQueryDto extends Z.class({
	category: z.string().optional(),
	includeHidden: z.boolean().default(false),
}) {}

export class ExpressionFunctionsResponseDto extends Z.class({
	success: z.boolean(),
	data: z.array(
		z.object({
			name: z.string(),
			description: z.string(),
			category: z.string(),
			syntax: z.string(),
		}),
	),
}) {}

export class ExpressionVariablesContextQueryDto extends Z.class({
	context: z.enum(['workflow', 'node', 'environment', 'all']).default('all'),
	includeHidden: z.boolean().default(false),
}) {}

export class ExpressionVariablesResponseDto extends Z.class({
	success: z.boolean(),
	data: z.array(
		z.object({
			name: z.string(),
			description: z.string(),
			type: z.string(),
			context: z.string(),
		}),
	),
}) {}
