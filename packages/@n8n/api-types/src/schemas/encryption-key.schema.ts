import { z } from 'zod';

export const encryptionKeySchema = z.object({
	id: z.string(),
	type: z.string(),
	algorithm: z.string().nullable(),
	status: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export const encryptionKeysListSchema = z.object({
	count: z.number(),
	items: z.array(encryptionKeySchema),
});

export type EncryptionKey = z.infer<typeof encryptionKeySchema>;
export type EncryptionKeysList = z.infer<typeof encryptionKeysListSchema>;
