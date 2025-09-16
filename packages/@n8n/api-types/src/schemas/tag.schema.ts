import { z } from 'zod';

export const tagSchema = z.object({
	id: z.string(),
	name: z.string(),
	usageCount: z.number().optional(),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});

export type Tag = z.infer<typeof tagSchema>;
