import { z } from 'zod';

/**
 * Plain credential row after creation
 * Used by the public API to validate results from `CredentialsService.createUnmanagedCredential`.
 */
export const publicApiCreatedCredentialSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	isManaged: z.boolean(),
	isGlobal: z.boolean(),
	isResolvable: z.boolean(),
	resolvableAllowFallback: z.boolean(),
	resolverId: z.union([z.string(), z.null()]).optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export type PublicApiCreatedCredential = z.infer<typeof publicApiCreatedCredentialSchema>;
