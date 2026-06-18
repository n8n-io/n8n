import { z } from 'zod';

export const serializedCredentialSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		type: z.string().min(1),
	})
	.strict();

export type SerializedCredential = z.infer<typeof serializedCredentialSchema>;
