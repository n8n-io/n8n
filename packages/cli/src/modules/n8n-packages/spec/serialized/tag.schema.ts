import { z } from 'zod';

export const serializedTagSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
	})
	.strict();

export type SerializedTag = z.infer<typeof serializedTagSchema>;
