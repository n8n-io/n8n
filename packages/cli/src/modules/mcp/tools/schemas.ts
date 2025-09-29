import z from 'zod';

export const nodeSchema = z
	.object({
		name: z.string(),
		type: z.string(),
	})
	.passthrough();

export const tagSchema = z.object({ id: z.string(), name: z.string() }).passthrough();
