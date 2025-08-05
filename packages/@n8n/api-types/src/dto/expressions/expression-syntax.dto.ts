import { z } from 'zod';
import { Z } from '@n8n/api-types/utils';
import { exampleSchema } from './function-documentation.dto';

export const expressionSyntaxDocSchema = z.object({
	topic: z.string(),
	description: z.string(),
	syntax: z.string(),
	examples: z.array(exampleSchema),
	relatedTopics: z.array(z.string()).optional(),
	notes: z.array(z.string()).optional(),
});

export const expressionSyntaxQuerySchema = z.object({
	topic: z.string().optional(),
	includeExamples: z.boolean().default(true),
	includeRelated: z.boolean().default(true),
});

export const expressionSyntaxResponseSchema = z.object({
	success: z.boolean(),
	data: z.union([expressionSyntaxDocSchema, z.array(expressionSyntaxDocSchema)]),
	metadata: z.object({
		requestedAt: z.string(),
		topic: z.string().optional(),
		totalCount: z.number().optional(),
	}),
});

export class ExpressionSyntaxQueryDto extends Z.class(expressionSyntaxQuerySchema) {}
export class ExpressionSyntaxResponseDto extends Z.class(expressionSyntaxResponseSchema) {}

export type ExpressionSyntaxDoc = z.infer<typeof expressionSyntaxDocSchema>;
