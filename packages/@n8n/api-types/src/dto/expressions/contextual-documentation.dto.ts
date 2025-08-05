import { z } from 'zod';
import { Z } from '@n8n/api-types/utils';
import { functionDocumentationSchema } from './function-documentation.dto';
import { variableDocumentationSchema } from './variable-documentation.dto';

export const contextualDocumentationQuerySchema = z.object({
	nodeType: z.string(),
	context: z.enum(['input', 'output', 'parameters']).optional(),
	includeVariables: z.boolean().default(true),
	includeFunctions: z.boolean().default(true),
	includeTips: z.boolean().default(true),
});

export const contextualDocumentationResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		relevantFunctions: z.array(functionDocumentationSchema),
		relevantVariables: z.array(variableDocumentationSchema),
		contextSpecificTips: z.array(z.string()),
	}),
	metadata: z.object({
		requestedAt: z.string(),
		nodeType: z.string(),
		context: z.string().optional(),
		totalFunctions: z.number(),
		totalVariables: z.number(),
		totalTips: z.number(),
	}),
});

export const documentationSearchQuerySchema = z.object({
	query: z.string().min(1),
	type: z.enum(['functions', 'variables', 'syntax']).optional(),
	limit: z.number().min(1).max(100).default(20),
	includeExamples: z.boolean().default(true),
});

export const documentationSearchResponseSchema = z.object({
	success: z.boolean(),
	data: z.object({
		functions: z.array(functionDocumentationSchema),
		variables: z.array(variableDocumentationSchema),
		syntax: z.array(
			z.object({
				topic: z.string(),
				description: z.string(),
				syntax: z.string(),
				examples: z.array(
					z.object({
						description: z.string(),
						code: z.string(),
						result: z.string().optional(),
					}),
				),
				relatedTopics: z.array(z.string()).optional(),
				notes: z.array(z.string()).optional(),
			}),
		),
	}),
	metadata: z.object({
		requestedAt: z.string(),
		query: z.string(),
		type: z.string().optional(),
		totalResults: z.number(),
		searchTimeMs: z.number().optional(),
	}),
});

export class ContextualDocumentationQueryDto extends Z.class(contextualDocumentationQuerySchema) {}
export class ContextualDocumentationResponseDto extends Z.class(
	contextualDocumentationResponseSchema,
) {}
export class DocumentationSearchQueryDto extends Z.class(documentationSearchQuerySchema) {}
export class DocumentationSearchResponseDto extends Z.class(documentationSearchResponseSchema) {}
