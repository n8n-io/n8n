import { z } from 'zod';

const projectIconSchema = z.object({
	type: z.enum(['emoji', 'icon']),
	value: z.string(),
});

export const serializedProjectSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	icon: projectIconSchema.optional(),
});

export type SerializedProject = z.infer<typeof serializedProjectSchema>;
