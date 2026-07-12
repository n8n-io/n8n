import { z } from 'zod';

export const serializedVariableSchema = z
	.object({
		name: z.string().min(1),
		type: z.string().min(1),
		value: z.string().optional(),
		projectId: z.string().min(1).optional(),
	})
	.strict()
	.superRefine((variable, ctx) => {
		if (variable.type !== 'string' && variable.value !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `A variable of type "${variable.type}" must not carry a value`,
			});
		}
	});

export type SerializedVariable = z.infer<typeof serializedVariableSchema>;
