import { z } from 'zod';
import { Z } from 'zod-class';

export const functionParameterSchema = z.object({
	name: z.string(),
	type: z.string(),
	description: z.string(),
	optional: z.boolean().optional(),
	defaultValue: z.any().optional(),
});

export const exampleSchema = z.object({
	description: z.string(),
	code: z.string(),
	result: z.string().optional(),
});

export const functionDocumentationSchema = z.object({
	name: z.string(),
	description: z.string(),
	syntax: z.string(),
	parameters: z.array(functionParameterSchema).optional(),
	returnType: z.string(),
	examples: z.array(exampleSchema),
	category: z.string(),
	tags: z.array(z.string()).optional(),
	relatedFunctions: z.array(z.string()).optional(),
	notes: z.array(z.string()).optional(),
	version: z.string().optional(),
});

export const functionDocumentationQuerySchema = z.object({
	functionName: z.string().optional(),
	category: z.string().optional(),
	includeExamples: z.boolean().default(true),
	includeRelated: z.boolean().default(true),
});

export const functionDocumentationResponseSchema = z.object({
	success: z.boolean(),
	data: z.union([functionDocumentationSchema, z.array(functionDocumentationSchema)]),
	metadata: z.object({
		requestedAt: z.string(),
		functionName: z.string().optional(),
		category: z.string().optional(),
		totalCount: z.number().optional(),
	}),
});

export class FunctionDocumentationQueryDto extends Z.class({
	functionName: z.string().optional(),
	category: z.string().optional(),
	includeExamples: z.boolean().default(true),
	includeRelated: z.boolean().default(true),
}) {}
export class FunctionDocumentationResponseDto extends Z.class({
	success: z.boolean(),
	data: z.union([functionDocumentationSchema, z.array(functionDocumentationSchema)]),
	metadata: z.object({
		requestedAt: z.string(),
		functionName: z.string().optional(),
		category: z.string().optional(),
		totalCount: z.number().optional(),
	}),
}) {}

export type FunctionParameter = z.infer<typeof functionParameterSchema>;
export type ExampleType = z.infer<typeof exampleSchema>;
export type FunctionDocumentation = z.infer<typeof functionDocumentationSchema>;
