import { z } from 'zod';

import { variableTypeSchema, variableValueSchema } from '../variables/base.dto';

export const serializedVariableSchema = z
	.object({
		name: z.string().min(1),
		type: variableTypeSchema,
		value: variableValueSchema.optional(),
	})
	.strict();

export type SerializedVariable = z.infer<typeof serializedVariableSchema>;
