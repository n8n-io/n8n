import { z } from 'zod';

export const serializedVariableSchema = z
	.object({
		name: z.string().min(1),
		type: z.string().min(1),
		value: z.string().optional(),
	})
	.strict();

export type SerializedVariable = z.infer<typeof serializedVariableSchema>;
