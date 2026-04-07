import { z } from 'zod';

/**
 * Plain credential row after creation
 * Used by the public API to validate results from `CredentialsService.createUnmanagedCredential`.
 */
export const publicApiCreatedCredentialSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	data: z.string(),
	isManaged: z.boolean(),
	isGlobal: z.boolean().default(false),
	isResolvable: z.boolean().default(false),
	resolvableAllowFallback: z.boolean().default(false),
	resolverId: z.union([z.string(), z.null()]).optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type PublicApiCreatedCredential = z.infer<typeof publicApiCreatedCredentialSchema>;
