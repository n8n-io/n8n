import { z } from 'zod';
import { Z } from '@n8n/api-types/utils';
import { exampleSchema } from './function-documentation.dto';

export const variablePropertySchema = z.object({
	type: z.string(),
	description: z.string(),
	example: z.string().optional(),
});

export const availabilitySchema = z.object({
	contexts: z.array(z.string()),
	nodeTypes: z.array(z.string()).optional(),
});

export const variableDocumentationSchema = z.object({
	name: z.string(),
	type: z.string(),
	description: z.string(),
	examples: z.array(exampleSchema),
	category: z.string(),
	properties: z.record(variablePropertySchema).optional(),
	notes: z.array(z.string()).optional(),
	availability: availabilitySchema.optional(),
});

export const variableDocumentationQuerySchema = z.object({
	variableName: z.string().optional(),
	category: z.string().optional(),
	context: z.enum(['all', 'core', 'workflow', 'node', 'environment']).default('all'),
	includeExamples: z.boolean().default(true),
	includeProperties: z.boolean().default(true),
});

export const variableDocumentationResponseSchema = z.object({
	success: z.boolean(),
	data: z.union([variableDocumentationSchema, z.array(variableDocumentationSchema)]),
	metadata: z.object({
		requestedAt: z.string(),
		variableName: z.string().optional(),
		category: z.string().optional(),
		context: z.string().optional(),
		totalCount: z.number().optional(),
	}),
});

export class VariableDocumentationQueryDto extends Z.class(variableDocumentationQuerySchema) {}
export class VariableDocumentationResponseDto extends Z.class(
	variableDocumentationResponseSchema,
) {}

export type VariableProperty = z.infer<typeof variablePropertySchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type VariableDocumentation = z.infer<typeof variableDocumentationSchema>;
