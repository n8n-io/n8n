import { TYPE_ENUM, variableValueSchema } from '@n8n/api-types';
import { z } from 'zod';

export const serializedVariableSchema = z
	.object({
		name: z.string().min(1),
		type: z.string().min(1),
		value: z.string().optional(),
	})
	.strict();

export type SerializedVariable = z.infer<typeof serializedVariableSchema>;

export const importedVariableSchema = serializedVariableSchema.extend({
	type: z.enum(TYPE_ENUM),
	value: variableValueSchema.optional(),
});

export type ImportedVariable = z.infer<typeof importedVariableSchema>;
